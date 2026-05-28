<?php

namespace Tests\Unit\Domain\Scraping;

use App\Domain\Scraping\AssetDownloader;
use App\Domain\Storage\LeadStorageService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * PR-A8: the relaxed portrait filter for role='team'. Board headshots are
 * commonly 150–400px squares that the ≥400×300 content rule throws away —
 * which is exactly why captioned Vorstand photos never reached the matcher
 * before. role='team' must keep a 200×200 portrait that role='content' drops,
 * while still rejecting genuine icons and banner strips.
 */
class AssetDownloaderTeamPortraitTest extends TestCase
{
    private function pngBytes(int $w, int $h): string
    {
        $im = imagecreatetruecolor($w, $h);
        // Per-pixel random noise defeats PNG compression so the encoded image
        // comfortably clears AssetDownloader::MIN_BYTES (1 KB) — a smooth
        // pattern compresses to a few hundred bytes and would be dropped.
        mt_srand(42);
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $c = imagecolorallocate($im, mt_rand(0, 255), mt_rand(0, 255), mt_rand(0, 255));
                imagesetpixel($im, $x, $y, $c);
            }
        }
        ob_start();
        imagepng($im);
        $bytes = (string) ob_get_clean();
        imagedestroy($im);

        return $bytes;
    }

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('leads');
        Storage::fake('public');
    }

    public function test_team_role_keeps_a_200px_portrait(): void
    {
        Http::fake([
            '*' => Http::response($this->pngBytes(200, 200), 200, ['Content-Type' => 'image/png']),
        ]);

        $downloader = new AssetDownloader(new LeadStorageService);
        $result = $downloader->downloadAll(
            1,
            [['src' => 'https://1.1.1.1/img/portrait-mueller.png', 'alt' => 'Obmann Hans Müller', 'role' => 'team']],
            'https://1.1.1.1/',
        );

        $this->assertCount(1, $result, '200x200 portrait should survive under role=team');
        $this->assertSame('team', $result[0]['role']);
        $this->assertSame('Obmann Hans Müller', $result[0]['alt']);
        $this->assertStringContainsString('team-', $result[0]['local_path']);
    }

    public function test_content_role_drops_the_same_200px_image(): void
    {
        Http::fake([
            '*' => Http::response($this->pngBytes(200, 200), 200, ['Content-Type' => 'image/png']),
        ]);

        $downloader = new AssetDownloader(new LeadStorageService);
        $result = $downloader->downloadAll(
            1,
            [['src' => 'https://1.1.1.1/img/portrait-mueller.png', 'alt' => 'Hans Müller', 'role' => 'content']],
            'https://1.1.1.1/',
        );

        $this->assertCount(0, $result, '200x200 image must be dropped by the ≥400x300 content filter');
    }

    public function test_team_role_still_rejects_a_banner_strip(): void
    {
        // 600x100 = 6:1 aspect → outside the portrait band (0.5–2.0), must drop
        // even under the relaxed team filter so a header strip can't sneak in.
        Http::fake([
            '*' => Http::response($this->pngBytes(600, 100), 200, ['Content-Type' => 'image/png']),
        ]);

        $downloader = new AssetDownloader(new LeadStorageService);
        $result = $downloader->downloadAll(
            1,
            [['src' => 'https://1.1.1.1/img/header-strip.png', 'alt' => 'Vorstand', 'role' => 'team']],
            'https://1.1.1.1/',
        );

        $this->assertCount(0, $result, 'extreme-aspect strip must be rejected even for team');
    }
}
