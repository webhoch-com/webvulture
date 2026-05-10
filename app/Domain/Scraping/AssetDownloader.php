<?php

namespace App\Domain\Scraping;

use App\Domain\Storage\LeadStorageService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AssetDownloader
{
    private const MAX_BYTES = 5 * 1024 * 1024;
    private const MIN_BYTES = 1024;
    private const TIMEOUT = 10;
    private const MAX_IMAGES = 30;

    // Raster only — SVG bewusst ausgenommen, weil Stored-XSS-Risiko zu hoch ist:
    // SVG kann <script> und Event-Handler enthalten, und Browser interpretieren
    // sie bei direkter Navigation (rechte Maustaste → Bild öffnen) als Dokument
    // im selben Origin wie die Hosting-App. Logos aus dem Web sind in >95% PNG/WEBP/JPG.
    // Falls SVG später zurück soll: nur mit serverseitigem DOMDocument-Sanitizer.
    private const ALLOWED_MIMES = [
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    public function __construct(
        protected LeadStorageService $store,
    ) {}

    /**
     * Download an array of image URLs into storage/app/public/leads/{id}/assets/.
     *
     * @param  array<int, array{src: string, alt?: string, role?: string}>  $images
     * @return array<int, array{src_original: string, public_url: string, local_path: string, role: string, alt: string, bytes: int}>
     */
    public function downloadAll(int $leadId, array $images, string $baseUrl): array
    {
        $downloaded = [];
        $seen = [];

        foreach (array_slice($images, 0, self::MAX_IMAGES) as $img) {
            $src = $img['src'] ?? null;
            if (!$src || isset($seen[$src])) {
                continue;
            }
            $seen[$src] = true;

            $result = $this->downloadOne($leadId, $src, $baseUrl);
            if (!$result) {
                continue;
            }

            $downloaded[] = array_merge($result, [
                'src_original' => $src,
                'role' => $img['role'] ?? 'content',
                'alt' => $img['alt'] ?? '',
            ]);
        }

        return $downloaded;
    }

    /**
     * Download a single asset (typically the logo). Returns asset descriptor or null.
     *
     * @return array{src_original: string, public_url: string, local_path: string, role: string, alt: string, bytes: int, mime: ?string}|null
     */
    public function downloadLogo(int $leadId, ?string $logoUrl, string $baseUrl): ?array
    {
        if (!$logoUrl) {
            return null;
        }

        $result = $this->downloadOne($leadId, $logoUrl, $baseUrl, prefix: 'logo');
        if (!$result) {
            return null;
        }

        return array_merge($result, [
            'src_original' => $logoUrl,
            'role' => 'logo',
            'alt' => 'Logo',
        ]);
    }

    /**
     * @return array{public_url: string, local_path: string, bytes: int, mime: ?string}|null
     */
    private function downloadOne(int $leadId, string $url, string $baseUrl, string $prefix = ''): ?array
    {
        try {
            $resolved = $this->resolveUrl($url, $baseUrl);
            if (!$this->isHttpUrl($resolved)) {
                return null;
            }
            if (!$this->isPublicHost($resolved)) {
                Log::debug("AssetDownloader: rejected non-public host for {$resolved}");
                return null;
            }

            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (compatible; WebVultureBot/1.0; +https://webvulture.app)',
                'Accept' => 'image/*,*/*;q=0.8',
            ])
                ->withOptions(['allow_redirects' => false])
                ->timeout(self::TIMEOUT)
                ->get($resolved);

            if (!$response->successful()) {
                return null;
            }

            $contents = $response->body();
            $bytes = strlen($contents);
            if ($bytes < self::MIN_BYTES || $bytes > self::MAX_BYTES) {
                return null;
            }

            $mime = strtolower($response->header('Content-Type') ?? '');
            $mime = trim(explode(';', $mime)[0]);

            $ext = self::ALLOWED_MIMES[$mime] ?? $this->guessExtensionFromUrl($resolved);
            if (!$ext) {
                return null;
            }

            $hash = substr(sha1($resolved.'|'.$bytes), 0, 16);
            $filename = ($prefix ? $prefix.'-' : '').$hash.'.'.$ext;

            $localPath = $this->store->writePublicAsset($leadId, $filename, $contents);
            $publicUrl = $this->store->publicAssetUrl($localPath);

            return [
                'public_url' => $publicUrl,
                'local_path' => $localPath,
                'bytes' => $bytes,
                'mime' => $mime ?: null,
            ];
        } catch (\Throwable $e) {
            Log::debug("AssetDownloader: failed for {$url}: {$e->getMessage()}");
            return null;
        }
    }

    private function isHttpUrl(string $url): bool
    {
        $scheme = parse_url($url, PHP_URL_SCHEME);
        return in_array($scheme, ['http', 'https'], true);
    }

    /**
     * SSRF guard: refuse to fetch URLs whose host resolves to a private/loopback/link-local IP.
     *
     * Mitigates `<img src=http://169.254.169.254/...>` (AWS IMDS) attacks via scraped pages.
     * Checks BOTH A (IPv4) and AAAA (IPv6) records — gethostbynamel() alone misses IPv6,
     * which means an attacker could publish A=8.8.8.8 + AAAA=fe80::1 and bypass the guard.
     * The narrow window between this check and the actual HTTP request still permits
     * a determined DNS-rebinding attack with very-short-TTL records, but blocking the
     * common cases (literal private IPs, AAAA missing) eliminates all reflexive exploits.
     */
    private function isPublicHost(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (!$host) {
            return false;
        }
        // Strip IPv6 literal brackets: parse_url returns [::1] including brackets.
        $host = trim($host, '[]');

        // If host is a literal IP, validate it directly (covers IPv4 + IPv6 literals).
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return (bool) filter_var(
                $host,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
            );
        }

        $allIps = [];

        // IPv4 (A records)
        $a = @gethostbynamel($host);
        if (is_array($a)) {
            $allIps = array_merge($allIps, $a);
        }

        // IPv6 (AAAA records) — gethostbynamel doesn't return these.
        $aaaa = @dns_get_record($host, DNS_AAAA);
        if (is_array($aaaa)) {
            foreach ($aaaa as $rec) {
                if (!empty($rec['ipv6'])) {
                    $allIps[] = $rec['ipv6'];
                }
            }
        }

        if (empty($allIps)) {
            return false;
        }

        foreach ($allIps as $ip) {
            if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return false;
            }
        }
        return true;
    }

    private function guessExtensionFromUrl(string $url): ?string
    {
        $path = parse_url($url, PHP_URL_PATH) ?? '';
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        return in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)
            ? ($ext === 'jpeg' ? 'jpg' : $ext)
            : null;
    }

    private function resolveUrl(string $src, string $baseUrl): string
    {
        if (str_starts_with($src, 'http')) {
            return $src;
        }
        if (str_starts_with($src, '//')) {
            return 'https:'.$src;
        }
        $base = parse_url($baseUrl);
        $scheme = $base['scheme'] ?? 'https';
        $host = $base['host'] ?? '';
        if (!$host) {
            return $src;
        }
        if (str_starts_with($src, '/')) {
            return "{$scheme}://{$host}{$src}";
        }
        // dirname() returns '.' for empty input, '\' on Windows, '/' for root.
        // Normalize all of these to a clean leading-slash directory.
        $basePath = $base['path'] ?? '/';
        $dir = $basePath === '/' ? '' : rtrim(dirname($basePath), '\\.');
        if ($dir === '' || $dir === '.') {
            $dir = '';
        }
        return "{$scheme}://{$host}{$dir}/{$src}";
    }
}
