<?php

namespace Tests\Feature;

use App\Domain\Scraping\AssetDownloader;
use App\Domain\Storage\LeadStorageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AssetDownloaderTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_downloads_a_logo_into_public_assets(): void
    {
        Storage::fake('public');

        // 1x1 PNG (transparent), >1KB after padding
        $pngBody = str_repeat("\x89PNG\r\n\x1a\nFAKE", 200);

        Http::fake([
            'https://example.com/logo.png' => Http::response($pngBody, 200, ['Content-Type' => 'image/png']),
        ]);

        $downloader = new AssetDownloader(app(LeadStorageService::class));

        $result = $downloader->downloadLogo(42, 'https://example.com/logo.png', 'https://example.com/');

        $this->assertNotNull($result);
        $this->assertSame('logo', $result['role']);
        $this->assertStringContainsString('leads/42/assets/logo-', $result['local_path']);
        Storage::disk('public')->assertExists($result['local_path']);
    }

    public function test_it_skips_oversized_images(): void
    {
        Storage::fake('public');

        $hugeBody = str_repeat('a', 6 * 1024 * 1024); // 6 MB > 5 MB ceiling
        Http::fake([
            'https://example.com/big.jpg' => Http::response($hugeBody, 200, ['Content-Type' => 'image/jpeg']),
        ]);

        $downloader = new AssetDownloader(app(LeadStorageService::class));
        $result = $downloader->downloadAll(7, [['src' => 'https://example.com/big.jpg', 'role' => 'content']], 'https://example.com/');

        $this->assertSame([], $result);
    }

    public function test_it_filters_invalid_mime_types(): void
    {
        Storage::fake('public');

        Http::fake([
            'https://example.com/page.html' => Http::response('<html>not an image</html>', 200, ['Content-Type' => 'text/html']),
        ]);

        $downloader = new AssetDownloader(app(LeadStorageService::class));
        $result = $downloader->downloadAll(8, [['src' => 'https://example.com/page.html', 'role' => 'content']], 'https://example.com/');

        $this->assertSame([], $result);
    }
}
