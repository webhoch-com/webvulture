<?php

namespace Tests\Unit\Domain\Scraping;

use App\Domain\Scraping\ScraperService;
use ReflectionMethod;
use RuntimeException;
use Tests\TestCase;

/**
 * Pin the SSRF guard (`assertSafeUrl`). An attacker who controls a Google
 * Places listing's website field could otherwise point us at internal
 * infrastructure (cloud metadata, localhost services, RFC1918 hosts).
 *
 * These cases are network-independent: IP literals validate locally, and
 * `.invalid` (RFC 2606) is guaranteed never to resolve, exercising the
 * fail-closed branch without a flaky live DNS dependency.
 */
class ScraperServiceSsrfGuardTest extends TestCase
{
    private function assertSafe(string $url): void
    {
        $m = new ReflectionMethod(ScraperService::class, 'assertSafeUrl');
        $m->setAccessible(true);
        $m->invoke($this->app->make(ScraperService::class), $url);
    }

    private function assertBlocked(string $url, string $becauseContains = ''): void
    {
        try {
            $this->assertSafe($url);
            $this->fail("Expected SSRF guard to block: {$url}");
        } catch (RuntimeException $e) {
            if ($becauseContains !== '') {
                $this->assertStringContainsString($becauseContains, $e->getMessage());
            } else {
                $this->assertTrue(true);
            }
        }
    }

    public function test_blocks_non_http_schemes(): void
    {
        $this->assertBlocked('file:///etc/passwd', 'scheme');
        $this->assertBlocked('gopher://127.0.0.1/', 'scheme');
        $this->assertBlocked('ftp://example.com/', 'scheme');
    }

    public function test_blocks_localhost(): void
    {
        $this->assertBlocked('http://localhost/', 'localhost');
        $this->assertBlocked('http://127.0.0.1/');
        $this->assertBlocked('https://[::1]/');
    }

    public function test_blocks_rfc1918_literals(): void
    {
        $this->assertBlocked('http://10.0.0.5/');
        $this->assertBlocked('http://192.168.1.1/');
        $this->assertBlocked('http://172.16.0.1/');
        $this->assertBlocked('http://169.254.169.254/latest/meta-data/'); // cloud IMDS
    }

    public function test_blocks_reserved_ip_literals_not_covered_by_coarse_regex(): void
    {
        // These do NOT match the RFC1918 regex but ARE reserved — they must be
        // caught by the literal-IP filter_var path added in the QA pass.
        $this->assertBlocked('http://192.0.2.1/', 'reserved');   // TEST-NET-1
        $this->assertBlocked('http://100.64.0.1/', 'reserved');  // CGNAT
        $this->assertBlocked('http://0.0.0.0/', '');
    }

    public function test_fails_closed_for_unresolvable_host(): void
    {
        // RFC 2606 reserved TLD — guaranteed NXDOMAIN. Empty resolution must
        // fail closed rather than slip through.
        $this->assertBlocked('http://nonexistent-host.invalid/', 'did not resolve');
    }

    public function test_allows_public_ip_literal(): void
    {
        // 8.8.8.8 is a public address — the guard must NOT throw. Uses an IP
        // literal so the test needs no live DNS.
        $this->assertSafe('https://8.8.8.8/');
        $this->addToAssertionCount(1);
    }
}
