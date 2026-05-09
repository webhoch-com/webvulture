<?php

namespace Tests\Unit\Domain\Quality;

use App\Domain\Quality\WebsiteQualityScorer;
use App\Models\WebsiteAnalysis;
use Tests\TestCase;

class WebsiteQualityScorerTest extends TestCase
{
    private WebsiteQualityScorer $scorer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->scorer = new WebsiteQualityScorer;
    }

    public function test_empty_analysis_returns_minimum_stars(): void
    {
        $result = $this->scorer->score(new WebsiteAnalysis);

        $this->assertSame(0, $result->score);
        $this->assertSame(1.0, $result->stars);
        $this->assertEmpty($result->positive);
        $this->assertNotEmpty($result->negative);
    }

    public function test_polished_website_scores_high(): void
    {
        $analysis = new WebsiteAnalysis([
            'http_status' => 200,
            'final_url' => 'https://example.at/',
            'title' => 'Beispiel Restaurant — Kulinarik in Salzburg',
            'meta_description' => 'Genießen Sie traditionelle österreichische Küche im Herzen von Salzburg. Reservieren Sie online oder rufen Sie an.',
            'logo_url' => 'https://example.at/logo.png',
            'contact' => ['email' => 'info@example.at', 'phone' => '+43 662 123456'],
            'services' => ['Frühstück', 'Mittagsmenü', 'À la carte', 'Catering'],
            'socials' => ['facebook' => 'https://fb.com/x', 'instagram' => 'https://ig.com/x'],
            'brand_colors' => ['#a31621', '#fcf7f8', '#053c5e'],
            'images' => array_fill(0, 8, 'https://example.at/img.jpg'),
            'text_content' => str_repeat('Lorem ipsum dolor sit amet. ', 100),
        ]);

        $result = $this->scorer->score($analysis);

        $this->assertSame(100, $result->score);
        $this->assertSame(5.0, $result->stars);
        $this->assertTrue($result->isHighQuality());
    }

    public function test_score_100_maps_to_5_stars(): void
    {
        $analysis = new WebsiteAnalysis([
            'http_status' => 200,
            'final_url' => 'https://perfect.at/',
            'title' => 'Perfect Site Title — Ten Plus Chars',
            'meta_description' => str_repeat('Word ', 15),
            'logo_url' => 'https://perfect.at/logo.png',
            'contact' => ['email' => 'a@b.at', 'phone' => '+43 1 1'],
            'services' => ['A', 'B', 'C'],
            'socials' => ['x' => 'https://x.com/y'],
            'brand_colors' => ['#fff', '#000'],
            'images' => ['a', 'b', 'c'],
            'text_content' => str_repeat('x', 1100),
        ]);

        $result = $this->scorer->score($analysis);

        $this->assertSame(100, $result->score);
        $this->assertSame(5.0, $result->stars);
    }

    public function test_basic_website_scores_medium(): void
    {
        $analysis = new WebsiteAnalysis([
            'http_status' => 200,
            'final_url' => 'https://basic.at/',
            'title' => 'Mein Geschäft',
            'meta_description' => null,
            'logo_url' => null,
            'contact' => ['phone' => '+43 1 23456'],
            'services' => ['Service A'],
            'socials' => [],
            'brand_colors' => ['#ffffff'],
            'images' => [],
            'text_content' => 'Kurzer Text.',
        ]);

        $result = $this->scorer->score($analysis);

        $this->assertGreaterThan(20, $result->score);
        $this->assertLessThan(60, $result->score);
        $this->assertGreaterThanOrEqual(2.0, $result->stars);
        $this->assertLessThan(4.0, $result->stars);
        $this->assertFalse($result->isHighQuality());
    }

    public function test_no_https_is_negative_signal(): void
    {
        $analysis = new WebsiteAnalysis([
            'http_status' => 200,
            'final_url' => 'http://insecure.at/',
            'title' => 'Insecure Site',
        ]);

        $result = $this->scorer->score($analysis);

        $this->assertContains('Keine HTTPS-Verschlüsselung', $result->negative);
    }

    public function test_stars_are_clamped_to_1_to_5_range(): void
    {
        $empty = $this->scorer->score(new WebsiteAnalysis);
        $this->assertGreaterThanOrEqual(1.0, $empty->stars);
        $this->assertLessThanOrEqual(5.0, $empty->stars);
    }
}
