<?php

namespace App\Domain\Outreach;

use App\Exceptions\OutreachThrottledException;
use App\Mail\LeadOutreachMail;
use App\Models\Lead;
use App\Models\OutreachMessage;
use App\Models\Prototype;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Send outreach emails to leads and persist them as OutreachMessage rows.
 *
 * Templates can reference dynamic placeholders:
 *   {name}        Business name
 *   {city}        Business city
 *   {category}    Lead category
 *   {preview_url} Generated demo prototype URL (if any), else empty
 *
 * Workflow:
 *   1. resolveRecipientEmail($lead) — looks up email from website analysis or returns null
 *   2. sendInitial / sendFollowup — composes & sends, persists OutreachMessage, updates Lead timestamps
 */
class OutreachService
{
    public function send(Lead $lead, string $subject, string $body, string $kind = 'custom'): OutreachMessage
    {
        $email = $this->resolveRecipientEmail($lead);
        if (! $email) {
            throw new \RuntimeException('Kein Empfänger — Lead hat keine E-Mail-Adresse.');
        }

        // Throttle BEFORE writing the OutreachMessage row so a throttled call
        // doesn't pollute the audit log with rows that never went out.
        $this->assertWithinThrottle($email);

        $renderedSubject = $this->render($subject, $lead);
        $renderedBody = $this->render($body, $lead);

        $message = OutreachMessage::create([
            'lead_id' => $lead->id,
            'channel' => 'email',
            'kind' => $kind,
            'subject' => $renderedSubject,
            'body' => $renderedBody,
            'to_email' => $email,
            'status' => 'queued',
        ]);

        // Deterministic Message-ID so inbound replies can be threaded back to this row.
        $msgHost = parse_url(config('agency.website'), PHP_URL_HOST) ?: 'webhoch.com';
        $messageId = sprintf('<wv-outreach-%d-%s@%s>', $message->id, \Illuminate\Support\Str::random(10), $msgHost);

        try {
            $mailable = new LeadOutreachMail($lead, $renderedSubject, $renderedBody);
            $mailable->withSymfonyMessage(function ($symfonyMessage) use ($messageId) {
                $symfonyMessage->getHeaders()->remove('Message-ID');
                $symfonyMessage->getHeaders()->addIdHeader('Message-ID', trim($messageId, '<>'));
            });

            Mail::to($email)->send($mailable);

            $message->update([
                'status' => 'sent',
                'sent_at' => now(),
                'message_id' => $messageId,
            ]);

            $lead->update([
                'last_outreach_at' => now(),
                'awaiting_response_since' => now(),
                // Do NOT reset replied_at — historical replies stay recorded.
                'status' => $lead->status?->value === 'replied' ? $lead->status : \App\Support\Enums\LeadStatus::Sent,
            ]);
        } catch (\Throwable $e) {
            $message->update([
                'status' => 'failed',
                'error' => substr($e->getMessage(), 0, 1000),
            ]);
            Log::error("Outreach failed for lead={$lead->id}: ".$e->getMessage());
            throw $e;
        }

        return $message;
    }

    public function defaultSubject(Lead $lead): string
    {
        return 'Vorschlag für Ihre neue Webseite — {name}';
    }

    public function defaultBody(Lead $lead): string
    {
        $previewUrl = $this->resolvePreviewUrl($lead);
        $previewLine = $previewUrl
            ? "Wir haben für Sie einen unverbindlichen, kostenlosen Entwurf vorbereitet:\n{$previewUrl}\n"
            : "Wir würden Ihnen gerne kostenlos und unverbindlich einen Designvorschlag erstellen.\n";

        $founder = config('agency.founder');
        $company = config('agency.company');
        $municipality = config('agency.address.municipality');
        $country = config('agency.address.country');
        $years = config('agency.years_active');

        return <<<TXT
Sehr geehrte Damen und Herren,

mein Name ist {$founder}, Inhaber der {$company} aus {$municipality} ({$country}).
Wir entwickeln seit {$years} maßgeschneiderte Webseiten, Online-Shops und Web-Apps für lokale Unternehmen.

Beim Recherchieren für Kunden in {city} bin ich auf {name} gestoßen — und habe mir gedacht: das könnte eine moderne, schnelle Online-Präsenz vertragen, die zu echten Anfragen führt.

{$previewLine}
Falls Sie kurz Zeit haben, freue ich mich über eine Antwort. Wenn das gerade nicht passt, antworten Sie einfach mit „Nein danke" — dann melde ich mich nicht mehr.

Mit freundlichen Grüßen
{$founder}
{$company}
TXT;
    }

    public function defaultFollowupSubject(Lead $lead): string
    {
        return 'Kurze Nachfrage — {name}';
    }

    public function defaultFollowupBody(Lead $lead): string
    {
        $previewUrl = $this->resolvePreviewUrl($lead);
        $previewLine = $previewUrl
            ? "Hier nochmal der Link zum Vorschlag, falls die erste Mail unter Ihrem Posteingang verschwunden ist:\n{$previewUrl}\n"
            : '';

        $founder = config('agency.founder');
        $company = config('agency.company');

        return <<<TXT
Sehr geehrte Damen und Herren,

ich wollte nur kurz nachfragen, ob meine Mail von letzter Woche durchgekommen ist — manchmal verschluckt der Spam-Filter so etwas.

{$previewLine}
Wenn Sie kein Interesse haben, ist das völlig in Ordnung — eine kurze Rückmeldung reicht und ich melde mich nicht mehr.

Mit freundlichen Grüßen
{$founder}
{$company}
TXT;
    }

    public function resolveRecipientEmail(Lead $lead): ?string
    {
        return $this->resolveRecipientWithReason($lead)['email'] ?? null;
    }

    /**
     * Returns ['email' => string|null, 'reason' => string]
     * Reasons: ok | no_analysis | no_contact_array | no_email_field | invalid_format
     */
    public function resolveRecipientWithReason(Lead $lead): array
    {
        $analysis = $lead->websiteAnalysis;
        if (! $analysis) {
            return ['email' => null, 'reason' => 'no_analysis'];
        }
        if (! is_array($analysis->contact ?? null)) {
            return ['email' => null, 'reason' => 'no_contact_array'];
        }
        $email = $analysis->contact['email'] ?? null;
        if (! is_string($email) || $email === '') {
            return ['email' => null, 'reason' => 'no_email_field'];
        }
        $email = trim(str_replace('mailto:', '', $email));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            \Illuminate\Support\Facades\Log::info(
                'OutreachService::resolveRecipient invalid email format',
                ['lead_id' => $lead->id, 'raw_value' => $email]
            );
            return ['email' => null, 'reason' => 'invalid_format'];
        }
        return ['email' => $email, 'reason' => 'ok'];
    }

    public function resolvePreviewUrl(Lead $lead): ?string
    {
        $proto = $lead->latestPrototype()->with('latestVersion')->first();
        $version = $proto?->latestVersion;
        if ($version?->preview_url) {
            return $version->preview_url;
        }
        if ($proto?->slug) {
            $domain = config('services.preview_host.root_domain', 'webseiten-werkstatt.at');
            return "https://{$proto->slug}.{$domain}/";
        }
        return null;
    }

    /**
     * Render subject + body with placeholders resolved, without sending.
     * Used by the UI to show the user what will go out before they commit.
     */
    public function renderForPreview(Lead $lead, string $subject, string $body): array
    {
        return [
            'subject' => $this->render($subject, $lead),
            'body' => $this->render($body, $lead),
        ];
    }

    private function render(string $template, Lead $lead): string
    {
        return strtr($template, [
            '{name}' => (string) $lead->name,
            '{city}' => (string) ($lead->city ?? ''),
            '{category}' => (string) ($lead->category ?? ''),
            '{preview_url}' => (string) ($this->resolvePreviewUrl($lead) ?? ''),
        ]);
    }

    /**
     * Two-layer outreach throttle:
     *  - Per recipient *domain*, max 1 mail per N seconds (prevents the same
     *    domain from getting hammered when a bulk-send accidentally targets
     *    multiple contacts at the same firma.com).
     *  - Per *day*, hard daily cap on total outbound (prevents the operator
     *    from shotgunning a 500-lead list and landing in spam).
     *
     * Configured via services.outreach.throttle.{domain_window_seconds,
     * daily_cap}. Cache backed — cleanup automatic via TTL.
     *
     * Throws OutreachThrottledException with a UI-friendly reason. The send()
     * caller catches this and surfaces it to the user via toast.
     */
    private function assertWithinThrottle(string $email): void
    {
        $domainWindow = (int) config('services.outreach.throttle.domain_window_seconds', 30);
        $dailyCap = (int) config('services.outreach.throttle.daily_cap', 50);

        // Daily cap: atomic counter via Cache::increment — a SELECT-then-COUNT
        // pattern races between concurrent queue workers and overshoots the cap.
        // We seed the counter from the DB the first time it's missing today,
        // then rely on atomic increments thereafter.
        //
        // Critical: capture $dailyKey ONCE upfront. Re-computing it later means
        // a midnight rollover between increment and decrement lands on a
        // different key — the new day's counter would seed at -1, effectively
        // disabling the cap until the next missing-check.
        $dailyKey = $dailyCap > 0
            ? 'outreach:daily-count:'.now()->toDateString()
            : null;

        if ($dailyKey !== null) {
            if (Cache::missing($dailyKey)) {
                $seed = OutreachMessage::whereDate('sent_at', today())
                    ->where('status', 'sent')
                    ->count();
                // 24 h TTL; missing-then-add is racy but the increment below
                // handles concurrent seeders correctly (overcounting at worst).
                Cache::add($dailyKey, $seed, now()->addDay());
            }
            $newCount = (int) Cache::increment($dailyKey);
            if ($newCount > $dailyCap) {
                Cache::decrement($dailyKey); // roll back the throttled attempt
                throw OutreachThrottledException::dailyCapReached($newCount - 1, $dailyCap);
            }
        }

        if ($domainWindow > 0) {
            $domain = strtolower((string) substr(strrchr($email, '@') ?: '', 1));
            if ($domain !== '') {
                $key = "outreach:domain-cooldown:{$domain}";
                // Cache::add returns false if the key already exists -> still cooling down.
                if (! Cache::add($key, time(), $domainWindow)) {
                    // Roll back the daily counter increment we did above so this
                    // throttled attempt doesn't burn a slot. Use the SAME key
                    // we incremented (not a fresh now()->toDateString()) so a
                    // midnight rollover doesn't decrement the wrong day.
                    if ($dailyKey !== null) {
                        Cache::decrement($dailyKey);
                    }
                    throw OutreachThrottledException::domainCooldown($domain, $domainWindow);
                }
            }
        }
    }
}
