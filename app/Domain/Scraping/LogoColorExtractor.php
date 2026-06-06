<?php

namespace App\Domain\Scraping;

use Illuminate\Support\Facades\Log;

/**
 * Extracts a brand-defining dominant colour from a downloaded logo file.
 *
 * Rationale: most company logos use one strong, distinctive non-neutral colour
 * even when the surrounding website CSS leans on a different accent. By sampling
 * that colour and threading it into the rebuild package, demo templates get to
 * look "branded to the company" rather than reusing the same generic accent for
 * every demo. The user explicitly asked for this — "farblich an die Logo Farben
 * angepasst" — in the Bauunternehmen-Direktiven.
 *
 * Algorithm (GD-based, no external deps):
 *   1. Load the image with GD. Resample to ≤ 80×80 for speed.
 *   2. Iterate every pixel, skip:
 *        - fully transparent / α > 90 (alpha 0..127, 127 = fully transparent)
 *        - near-white / near-black / near-grey (low chroma OR extreme V)
 *   3. Quantise remaining pixels into 27 colour buckets (3-bit per channel).
 *   4. Pick the bucket with the highest count.
 *   5. Re-walk the contributing pixels in that bucket to compute their MEAN.
 *      That gives a representative colour, not a quantisation artifact.
 *   6. Return as #RRGGBB. Returns null if no pixel qualifies (pure mono logo).
 *
 * Inspired by widely-used colorthief libraries but kept tiny + dependency-free.
 */
class LogoColorExtractor
{
    /** Max width/height of the resampled working image. Keeps the loop tiny. */
    private const SAMPLE_DIM = 80;

    /** Pixels with this much transparency or more are skipped (0..127 GD scale). */
    private const ALPHA_SKIP = 90;

    /** Pixels with chroma below this in 0..255 are treated as grey and skipped. */
    private const MIN_CHROMA = 26;

    /** Pixels brighter than this V are skipped as "near-white" (0..255). */
    private const MAX_BRIGHTNESS = 244;

    /** Pixels darker than this V are skipped as "near-black" (0..255). */
    private const MIN_BRIGHTNESS = 22;

    /**
     * @return string|null  hex colour like "#1e3a5f", or null if no qualifying pixel.
     */
    public function extract(string $localPath): ?string
    {
        if (! function_exists('imagecreatefromstring')) {
            return null;
        }
        if (! is_file($localPath) || filesize($localPath) === 0) {
            return null;
        }

        try {
            $bytes = @file_get_contents($localPath);
            if ($bytes === false) {
                return null;
            }
            $src = @imagecreatefromstring($bytes);
            if ($src === false) {
                return null;
            }

            $srcW = imagesx($src);
            $srcH = imagesy($src);
            if ($srcW < 1 || $srcH < 1) {
                imagedestroy($src);
                return null;
            }

            // Downsize for speed. Keep aspect.
            $scale = min(self::SAMPLE_DIM / $srcW, self::SAMPLE_DIM / $srcH, 1.0);
            $w = max(1, (int) round($srcW * $scale));
            $h = max(1, (int) round($srcH * $scale));
            $img = imagecreatetruecolor($w, $h);
            imagealphablending($img, false);
            imagesavealpha($img, true);
            $transparent = imagecolorallocatealpha($img, 0, 0, 0, 127);
            imagefilledrectangle($img, 0, 0, $w, $h, $transparent);
            imagecopyresampled($img, $src, 0, 0, 0, 0, $w, $h, $srcW, $srcH);
            imagedestroy($src);

            // First pass: bucket by 3-bit (8 levels) per channel → 512 buckets.
            $buckets = [];
            $bucketSamples = [];
            for ($y = 0; $y < $h; $y++) {
                for ($x = 0; $x < $w; $x++) {
                    $rgba = imagecolorat($img, $x, $y);
                    $a = ($rgba >> 24) & 0x7F;
                    if ($a >= self::ALPHA_SKIP) {
                        continue;
                    }
                    $r = ($rgba >> 16) & 0xFF;
                    $g = ($rgba >> 8) & 0xFF;
                    $b = $rgba & 0xFF;
                    $maxC = max($r, $g, $b);
                    $minC = min($r, $g, $b);
                    if ($maxC > self::MAX_BRIGHTNESS) {
                        continue;
                    }
                    if ($maxC < self::MIN_BRIGHTNESS) {
                        continue;
                    }
                    if (($maxC - $minC) < self::MIN_CHROMA) {
                        continue;
                    }
                    $key = (($r >> 5) << 6) | (($g >> 5) << 3) | ($b >> 5);
                    $buckets[$key] = ($buckets[$key] ?? 0) + 1;
                    $bucketSamples[$key][] = [$r, $g, $b];
                }
            }
            imagedestroy($img);

            if (empty($buckets)) {
                return null;
            }

            arsort($buckets);
            $winner = array_key_first($buckets);
            $samples = $bucketSamples[$winner];
            $n = count($samples);
            $sumR = 0; $sumG = 0; $sumB = 0;
            foreach ($samples as $px) {
                $sumR += $px[0];
                $sumG += $px[1];
                $sumB += $px[2];
            }
            $r = (int) round($sumR / $n);
            $g = (int) round($sumG / $n);
            $b = (int) round($sumB / $n);

            return sprintf('#%02x%02x%02x', $r, $g, $b);
        } catch (\Throwable $e) {
            Log::debug("LogoColorExtractor: extraction failed for {$localPath}: {$e->getMessage()}");
            return null;
        }
    }
}
