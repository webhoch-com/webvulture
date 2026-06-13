<?php

namespace App\Domain\Outreach;

use App\Models\AppSetting;
use App\Models\Lead;
use App\Models\OutreachMessage;
use App\Support\Enums\LeadStatus;
use Illuminate\Support\Facades\Log;
use Webklex\PHPIMAP\ClientManager;

/**
 * Polls the configured IMAP mailbox (typically hello@webhoch.com) for new messages
 * and matches their `From:` address against existing OutreachMessage rows. When a match
 * is found, the corresponding Lead is flagged as replied (status=Replied,
 * replied_at=now, awaiting_response_since=null).
 *
 * Idempotent: scans messages since the last successful scan timestamp (cached).
 *
 * Required env vars (set on server, not committed):
 *   IMAP_HOST=imap.webhoch.com
 *   IMAP_PORT=993
 *   IMAP_USERNAME=hello@webhoch.com
 *   IMAP_PASSWORD=<secret>
 *   IMAP_ENCRYPTION=ssl  (or tls)
 *   IMAP_FOLDER=INBOX    (optional, defaults to INBOX)
 *   IMAP_MARK_SEEN=false (optional, default false — does not flag scanned messages)
 *
 * If IMAP_HOST is empty, the scanner is a no-op (so nothing breaks in dev).
 */
class InboundMailScanner
{
    private const CURSOR_KEY = 'outreach.imap.last_scan_at';

    public function scan(): array
    {
        $host = (string) config('services.imap.host');
        if ($host === '') {
            return ['skipped' => true, 'reason' => 'IMAP_HOST not configured'];
        }

        $cm = new ClientManager;
        $client = $cm->make([
            'host' => $host,
            'port' => (int) config('services.imap.port', 993),
            'encryption' => (string) config('services.imap.encryption', 'ssl'),
            'validate_cert' => (bool) config('services.imap.validate_cert', true),
            'username' => (string) config('services.imap.username'),
            'password' => (string) config('services.imap.password'),
            'protocol' => 'imap',
        ]);

        try {
            $client->connect();
        } catch (\Throwable $e) {
            // Sanitise potential `user:password@host` leaks from IMAP exception strings
            $safe = preg_replace('/:[^:@\/\s]+@/', ':***@', $e->getMessage());
            Log::error('IMAP connect failed: '.$safe);
            return ['error' => 'imap_connect_failed'];
        }

        $folderName = (string) config('services.imap.folder', 'INBOX');
        $folder = $client->getFolder($folderName);
        if (! $folder) {
            return ['error' => 'folder_not_found', 'folder' => $folderName];
        }

        // Cursor: only scan messages since last successful run (default: last 24h).
        // Persisted in DB so it survives Redis cache eviction.
        $since = AppSetting::remember(self::CURSOR_KEY) ?: now()->subDay();
        $sinceCarbon = is_string($since) ? \Carbon\Carbon::parse($since) : $since;

        $query = $folder->messages()
            ->setFetchOrder('asc')
            ->since($sinceCarbon);

        $messages = $query->get();

        $matched = 0;
        $latestSeenDate = $sinceCarbon;

        try {
            foreach ($messages as $message) {
                // Per-message try/catch: a single malformed/encoded message used to
                // throw out of the loop, skipping both `setFlag('Seen')` AND the
                // cursor write at the bottom — the cursor never advanced, so on
                // the next run the same broken message was re-fetched first,
                // permanently stalling reply detection.
                try {
                    $fromAddress = $message->getFrom()->first();
                    $fromEmail = strtolower(trim((string) ($fromAddress?->mail ?? '')));
                    if ($fromEmail === '') {
                        continue;
                    }

                    // Track latest message date for cursor
                    $messageDate = $message->getDate()?->first();
                    if ($messageDate) {
                        $msgCarbon = \Carbon\Carbon::parse($messageDate);
                        if ($msgCarbon->gt($latestSeenDate)) {
                            $latestSeenDate = $msgCarbon;
                        }
                    }

                    // Try threading first (more accurate), then fall back to address match.
                    $inReplyTo = $this->headerValue($message, 'In-Reply-To');
                    $references = $this->headerValue($message, 'References');

                    $matchedHere = false;
                    if ($inReplyTo) {
                        $matchedHere = $this->markReplyForMessageId($inReplyTo, $messageDate);
                    }
                    if (! $matchedHere && $references) {
                        foreach (preg_split('/\s+/', trim($references)) as $ref) {
                            if ($ref && $this->markReplyForMessageId($ref, $messageDate)) {
                                $matchedHere = true;
                                break;
                            }
                        }
                    }
                    if (! $matchedHere && ! $this->isSystemSender($fromEmail)) {
                        $matchedHere = $this->markReplyForEmail($fromEmail, $messageDate);
                    }
                    if ($matchedHere) {
                        $matched++;
                    }

                    if ((bool) config('services.imap.mark_seen', false)) {
                        try {
                            $message->setFlag('Seen');
                        } catch (\Throwable $e) {
                            // Don't crash the loop, but DO log — silent setFlag
                            // failures (IMAP timeout, auth revocation, quota
                            // exceeded) used to leave messages unflagged forever
                            // with no operator signal.
                            Log::debug("InboundMailScanner: setFlag('Seen') failed", [
                                'message_id' => $this->headerValue($message, 'Message-ID') ?? '?',
                                'err' => $e->getMessage(),
                            ]);
                        }
                    }
                } catch (\Throwable $e) {
                    Log::warning("InboundMailScanner: skipped one message", [
                        'err' => $e->getMessage(),
                    ]);
                    continue;
                }
            }
        } finally {
            // Cursor write + disconnect happen regardless of which message
            // threw — so the loop always advances past the messages we DID
            // successfully look at.
            AppSetting::set(self::CURSOR_KEY, $latestSeenDate->toIso8601String());
            try {
                $client->disconnect();
            } catch (\Throwable $e) {
                Log::debug("InboundMailScanner: disconnect failed", ['err' => $e->getMessage()]);
            }
        }

        Log::info("InboundMailScanner: scanned {$messages->count()} messages, matched {$matched} replies");

        return [
            'scanned' => $messages->count(),
            'matched' => $matched,
            'cursor' => $latestSeenDate->toDateTimeString(),
        ];
    }

    private function markReplyForEmail(string $fromEmail, $messageDate): bool
    {
        // Find most recent outreach to this address that hasn't been marked replied yet.
        $om = OutreachMessage::query()
            ->whereRaw('LOWER(to_email) = ?', [$fromEmail])
            ->whereNotNull('sent_at')
            ->whereNull('replied_at')
            ->latest('sent_at')
            ->first();

        return $om ? $this->applyReply($om, $messageDate) : false;
    }

    private function markReplyForMessageId(string $messageId, $messageDate): bool
    {
        $messageId = trim($messageId);
        $om = OutreachMessage::query()
            ->where('message_id', $messageId)
            ->whereNotNull('sent_at')
            ->whereNull('replied_at')
            ->first();

        return $om ? $this->applyReply($om, $messageDate) : false;
    }

    private function applyReply(OutreachMessage $om, $messageDate): bool
    {
        $repliedAt = $messageDate ? \Carbon\Carbon::parse($messageDate) : now();

        $om->update(['replied_at' => $repliedAt]);

        $lead = Lead::find($om->lead_id);
        if ($lead) {
            $lead->update([
                'replied_at' => $repliedAt,
                'awaiting_response_since' => null,
                'status' => LeadStatus::Replied,
            ]);
        }

        return true;
    }

    private function isSystemSender(string $fromEmail): bool
    {
        $local = strtolower(strtok($fromEmail, '@'));
        return in_array($local, [
            'mailer-daemon', 'postmaster', 'no-reply', 'noreply',
            'do-not-reply', 'donotreply', 'bounces', 'bounce', 'mailer',
        ], true);
    }

    private function headerValue($message, string $name): ?string
    {
        try {
            $headers = $message->getHeader();
            if (! $headers) {
                return null;
            }
            $value = $headers->get(strtolower(str_replace('-', '_', $name)));
            return is_string($value) ? trim($value) : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
