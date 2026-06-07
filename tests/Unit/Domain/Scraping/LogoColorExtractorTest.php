<?php

namespace Tests\Unit\Domain\Scraping;

use App\Domain\Scraping\LogoColorExtractor;
use Tests\TestCase;

/**
 * Pins the contract of LogoColorExtractor: dominant non-neutral colour out of
 * a logo file, null when the image has no qualifying pixels (pure mono / all
 * transparent / missing file / corrupt bytes). Required by the project
 * Test-Pflicht convention for new Domain services.
 */
class LogoColorExtractorTest extends TestCase
{
    private function makePng(callable $paint, int $w = 80, int $h = 80): string
    {
        $im = imagecreatetruecolor($w, $h);
        imagealphablending($im, false);
        imagesavealpha($im, true);
        $transparent = imagecolorallocatealpha($im, 0, 0, 0, 127);
        imagefilledrectangle($im, 0, 0, $w, $h, $transparent);
        $paint($im, $w, $h);
        ob_start();
        imagepng($im);
        $bytes = (string) ob_get_clean();
        imagedestroy($im);

        $tmp = tempnam(sys_get_temp_dir(), 'logocolor_').'.png';
        file_put_contents($tmp, $bytes);

        return $tmp;
    }

    public function test_returns_hex_for_a_solid_colour_logo(): void
    {
        $path = $this->makePng(function ($im) {
            $blue = imagecolorallocate($im, 30, 90, 180);
            imagefilledrectangle($im, 10, 10, 70, 70, $blue);
        });

        $hex = (new LogoColorExtractor)->extract($path);
        @unlink($path);

        $this->assertIsString($hex);
        $this->assertMatchesRegularExpression('/^#[0-9a-f]{6}$/', $hex);
        // The dominant colour should be near (30, 90, 180). Allow a wide
        // tolerance because GD downsamples then averages the winning bucket.
        $r = hexdec(substr($hex, 1, 2));
        $g = hexdec(substr($hex, 3, 2));
        $b = hexdec(substr($hex, 5, 2));
        $this->assertLessThan(30, abs($r - 30), "R off: {$hex}");
        $this->assertLessThan(30, abs($g - 90), "G off: {$hex}");
        $this->assertLessThan(30, abs($b - 180), "B off: {$hex}");
    }

    public function test_returns_null_for_pure_monochrome_logo(): void
    {
        // Solid black on transparent — no non-neutral pixel anywhere.
        $path = $this->makePng(function ($im) {
            $black = imagecolorallocate($im, 0, 0, 0);
            imagefilledrectangle($im, 10, 10, 70, 70, $black);
        });

        $hex = (new LogoColorExtractor)->extract($path);
        @unlink($path);

        $this->assertNull($hex);
    }

    public function test_returns_null_for_fully_transparent_image(): void
    {
        // Don't paint anything — image stays fully transparent.
        $path = $this->makePng(function () { /* no-op */ });

        $hex = (new LogoColorExtractor)->extract($path);
        @unlink($path);

        $this->assertNull($hex);
    }

    public function test_returns_null_for_missing_file(): void
    {
        $hex = (new LogoColorExtractor)->extract('/tmp/definitely-not-a-real-file-'.uniqid().'.png');
        $this->assertNull($hex);
    }

    public function test_returns_null_for_corrupt_bytes(): void
    {
        $tmp = tempnam(sys_get_temp_dir(), 'logocolor_corrupt_').'.png';
        file_put_contents($tmp, 'not actually a png');
        $hex = (new LogoColorExtractor)->extract($tmp);
        @unlink($tmp);
        $this->assertNull($hex);
    }

    public function test_skips_near_white_and_picks_the_brand_colour(): void
    {
        // 80×80 mostly white with a brand-colour stripe in the middle.
        $path = $this->makePng(function ($im, $w, $h) {
            $white = imagecolorallocate($im, 250, 250, 250);
            imagefilledrectangle($im, 0, 0, $w, $h, $white);
            $brand = imagecolorallocate($im, 200, 60, 30);
            imagefilledrectangle($im, 20, 30, 60, 50, $brand);
        });

        $hex = (new LogoColorExtractor)->extract($path);
        @unlink($path);

        $this->assertIsString($hex);
        $r = hexdec(substr($hex, 1, 2));
        // The brand stripe red should dominate; the off-white skips the low-
        // chroma filter so it never enters the bucket count.
        $this->assertGreaterThan(150, $r, "expected dominant red channel, got {$hex}");
    }
}
