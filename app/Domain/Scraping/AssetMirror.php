<?php

namespace App\Domain\Scraping;

use App\Models\WebsiteAnalysis;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Mirrors scraped image assets (logo, favicon, hero, gallery) into the local
 * filesystem so the generated demo doesn't hot-link to the prospect's domain.
 *
 * Why hot-linking is bad:
 *  - Steals the prospect's bandwidth on every demo view
 *  - Mixed-content if their site is HTTP-only
 *  - Copyright exposure (we serve their JPGs from our subdomain without permission)
 *  - Demo breaks if they take their site offline
 *
 * Output: writes to {storage}/leads/{leadId}/mirror/<sha256>.<ext> AND returns
 * a same-domain URL `/_cache/{leadId}/<sha256>.<ext>` for templates to use.
 *
 * Cap: 12 images per lead, 5 MB per image, 2048 char URL.
 */
class AssetMirror
{
    private const MAX_BYTES = 5 * 1024 * 1024;
    private const MAX_PER_LEAD = 12;
    private const TIMEOUT_S = 8;

    /**
     * MIME → extension allowlist. SVG and ICO intentionally excluded:
     * - SVG can contain scripts (XSS via same-origin /storage path).
     * - ICO has historic format-confusion issues across browsers.
     * Magic-byte verification on the body further locks the actual content.
     */
    private const ALLOWED_MIME = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    /**
     * First few bytes of each allowed format. We re-derive the extension
     * from the body, never trusting the server's Content-Type header.
     */
    private const MAGIC_BYTES = [
        'jpg' => "\xFF\xD8\xFF",
        'png' => "\x89PNG\r\n\x1A\n",
        'webp' => "RIFF",  // followed by "WEBP" at byte 8 — verified separately
        'gif' => "GIF8",
    ];

    /**
     * Mirror all asset URLs found in $analysis. Returns a map of
     * `original_url => mirrored_url` (same-domain). URLs that fail to mirror
     * are NOT included — caller should fall back to the original URL or omit.
     */
    public function mirror(WebsiteAnalysis $analysis): array
    {
        $urls = $this->collectUrls($analysis);
        if (empty($urls)) {
            return [];
        }

        $map = [];
        $count = 0;
        foreach ($urls as $url) {
            if ($count >= self::MAX_PER_LEAD) {
                break;
            }
            $local = $this->fetchOne($analysis->lead_id, $url);
            if ($local !== null) {
                $map[$url] = $local;
                $count++;
            }
        }

        return $map;
    }

    private function collectUrls(WebsiteAnalysis $analysis): array
    {
        $urls = [];
        if ($analysis->logo_url) {
            $urls[] = $analysis->logo_url;
        }
        if ($analysis->favicon_url) {
            $urls[] = $analysis->favicon_url;
        }
        foreach (($analysis->images ?? []) as $img) {
            if (is_array($img) && ! empty($img['src']) && is_string($img['src'])) {
                $urls[] = $img['src'];
            }
        }

        return array_values(array_unique(array_filter(
            $urls,
            fn ($u) => is_string($u)
                && strlen($u) <= 2048
                && preg_match('#^https?://#i', $u),
        )));
    }

    private function fetchOne(int $leadId, string $url): ?string
    {
        // SSRF guard: validate the URL points to a public host BEFORE making
        // any HTTP request. Without this an attacker-controlled scraped URL
        // could probe localhost/RFC1918/cloud-metadata.
        if (! $this->isPublicHttpUrl($url)) {
            Log::debug("AssetMirror: blocked non-public URL {$url}");
            return null;
        }

        try {
            $resp = Http::timeout(self::TIMEOUT_S)
                ->withHeaders(['User-Agent' => 'WebVulture-AssetMirror/1.0 (+https://webhoch.com)'])
                // Redirects DISABLED — they bypass our isPublicHttpUrl check.
                // If a 301/302 comes back we ignore it. Legitimate hot-link
                // CDNs that redirect break here; that's an acceptable tradeoff
                // for closing the SSRF redirect-bypass.
                ->withOptions(['allow_redirects' => false])
                ->get($url);

            if (! $resp->successful()) {
                Log::debug("AssetMirror: HTTP {$resp->status()} for {$url}");
                return null;
            }

            // Pre-check Content-Length when present — avoids buffering huge
            // payloads in memory.
            $declaredLen = (int) ($resp->header('Content-Length') ?? 0);
            if ($declaredLen > 0 && $declaredLen > self::MAX_BYTES) {
                Log::debug("AssetMirror: declared too large {$declaredLen} for {$url}");
                return null;
            }

            $body = $resp->body();
            if (strlen($body) > self::MAX_BYTES) {
                Log::debug("AssetMirror: body too large for {$url} (".strlen($body).' bytes)');
                return null;
            }

            // Detect format from MAGIC BYTES (server Content-Type is untrusted).
            $ext = $this->detectExtensionFromBytes($body);
            if (! $ext) {
                Log::debug("AssetMirror: unrecognised image bytes for {$url}");
                return null;
            }

            // Hash on body only — same image referenced via different URLs
            // (?v=1, ?v=2, CDN variants) deduplicates to a single file per lead.
            $hash = hash('sha256', $body);
            $filename = substr($hash, 0, 16).'.'.$ext;
            $path = "leads/{$leadId}/mirror/{$filename}";

            // Use 'public' disk (symlinked into public/storage) so served via Nginx.
            Storage::disk('public')->put($path, $body);

            return Storage::disk('public')->url($path);
        } catch (\Throwable $e) {
            Log::debug("AssetMirror failed for {$url}: ".$e->getMessage());
            return null;
        }
    }

    /**
     * Returns true only if the URL is http/https AND every resolved IP for
     * its hostname is a public unicast address (rejects loopback, link-local,
     * RFC1918, multicast, IPv6 unique-local). Resolution happens once here;
     * with redirects disabled in fetchOne(), there's no DNS-rebinding window.
     */
    private function isPublicHttpUrl(string $url): bool
    {
        $p = @parse_url($url);
        if (! $p) {
            return false;
        }
        $scheme = strtolower($p['scheme'] ?? '');
        if (! in_array($scheme, ['http', 'https'], true)) {
            return false;
        }
        $host = $p['host'] ?? '';
        if ($host === '') {
            return false;
        }
        // Block hostnames that are themselves IP literals targeting private space.
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return $this->isPublicIp($host);
        }
        // Resolve A + AAAA. Empty result → cannot validate → reject.
        $ips = [];
        $a = @gethostbynamel($host);
        if (is_array($a)) {
            $ips = array_merge($ips, $a);
        }
        $aaaa = @dns_get_record($host, DNS_AAAA);
        if (is_array($aaaa)) {
            foreach ($aaaa as $rec) {
                if (! empty($rec['ipv6'])) {
                    $ips[] = $rec['ipv6'];
                }
            }
        }
        if ($ips === []) {
            return false;
        }
        foreach ($ips as $ip) {
            if (! $this->isPublicIp($ip)) {
                return false;
            }
        }
        return true;
    }

    private function isPublicIp(string $ip): bool
    {
        return (bool) filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
        );
    }

    /**
     * Identify image format by checking the first few bytes. Returns the
     * extension we'll save under, or null if the bytes don't match any
     * allowed format.
     */
    private function detectExtensionFromBytes(string $body): ?string
    {
        if (strlen($body) < 12) {
            return null;
        }
        if (str_starts_with($body, self::MAGIC_BYTES['jpg'])) {
            return 'jpg';
        }
        if (str_starts_with($body, self::MAGIC_BYTES['png'])) {
            return 'png';
        }
        if (str_starts_with($body, self::MAGIC_BYTES['gif'])) {
            return 'gif';
        }
        // WebP: "RIFF" + 4 bytes size + "WEBP"
        if (str_starts_with($body, self::MAGIC_BYTES['webp']) && substr($body, 8, 4) === 'WEBP') {
            return 'webp';
        }
        return null;
    }

    /**
     * Apply a URL map to a list of `{src, alt}` images. URLs not in the map
     * are dropped (we don't want to keep hot-linked URLs alongside mirrored ones).
     */
    public function rewriteImages(array $images, array $urlMap): array
    {
        $out = [];
        foreach ($images as $img) {
            $src = is_array($img) ? ($img['src'] ?? null) : null;
            if (is_string($src) && isset($urlMap[$src])) {
                // Preserve original_src so the orchestrator's image-quality
                // scorer can still see filename hints like "raiffeisen-logo"
                // — without it, every mirrored URL is an opaque hash and
                // sponsor/icon filters become useless.
                $out[] = [
                    'src' => $urlMap[$src],
                    'original_src' => $src,
                    'alt' => $img['alt'] ?? '',
                ];
            }
        }

        return $out;
    }

    /** Translate a single original URL via the map; returns null if not mirrored. */
    public function rewriteOne(?string $url, array $urlMap): ?string
    {
        if (! $url) {
            return null;
        }
        return $urlMap[$url] ?? null;
    }
}
