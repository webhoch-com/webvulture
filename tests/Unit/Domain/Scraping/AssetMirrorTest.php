<?php

namespace Tests\Unit\Domain\Scraping;

use App\Domain\Scraping\AssetMirror;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Locks the SSRF guard surface of AssetMirror. Drift here turns the
 * scraper into an internal-network probe — every rejected URL in this
 * file represents a documented attack class.
 */
class AssetMirrorTest extends TestCase
{
    private function isPublic(string $url): bool
    {
        $m = new ReflectionMethod(AssetMirror::class, 'isPublicHttpUrl');
        $m->setAccessible(true);

        return $m->invoke(new AssetMirror, $url);
    }

    public function test_rejects_non_http_schemes(): void
    {
        foreach (['javascript:alert(1)', 'data:image/png;base64,AAA', 'file:///etc/passwd', 'ftp://example.com/x'] as $url) {
            $this->assertFalse($this->isPublic($url), "scheme should be rejected: {$url}");
        }
    }

    public function test_rejects_loopback_literal_urls(): void
    {
        foreach (['http://127.0.0.1/x.jpg', 'http://[::1]/x.jpg', 'http://localhost/x.jpg'] as $url) {
            // localhost typically resolves to 127.0.0.1 / ::1 → must reject.
            $this->assertFalse($this->isPublic($url), "loopback should be rejected: {$url}");
        }
    }

    public function test_rejects_rfc1918_literal_urls(): void
    {
        foreach (['http://10.0.0.1/x.jpg', 'http://172.16.0.5/x.jpg', 'http://192.168.1.1/x.jpg'] as $url) {
            $this->assertFalse($this->isPublic($url), "private space should be rejected: {$url}");
        }
    }

    public function test_rejects_link_local_and_metadata_endpoints(): void
    {
        foreach (['http://169.254.169.254/latest/meta-data/', 'http://[fe80::1]/x'] as $url) {
            $this->assertFalse($this->isPublic($url), "link-local / metadata should be rejected: {$url}");
        }
    }

    public function test_rejects_bare_host_without_scheme(): void
    {
        $this->assertFalse($this->isPublic('example.com/x.jpg'));
    }

    public function test_accepts_well_known_public_host_when_dns_resolves(): void
    {
        // example.com resolves to 23.x — a public IP. Skip if no DNS in CI.
        $ips = @gethostbynamel('example.com');
        if (! is_array($ips) || $ips === []) {
            $this->markTestSkipped('No DNS in this environment; cannot validate public-resolve path.');
        }
        $this->assertTrue($this->isPublic('https://example.com/img.png'));
    }
}
