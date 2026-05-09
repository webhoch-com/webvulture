<?php

namespace App\Domain\Quality;

use App\Models\WebsiteAnalysis;

/**
 * Heuristic scorer for website quality based on scraped data.
 *
 * Outputs a 0-100 score and a derived 1-5 star rating, plus a list of
 * positive and negative signals for transparency in the UI.
 *
 * High score = website looks already polished → lead vermutlich nicht akquise-relevant.
 * Low score  = bestehende Website zeigt Schwächen → guter Akquise-Kandidat.
 */
class WebsiteQualityScorer
{
    public function score(WebsiteAnalysis $a): WebsiteQualityResult
    {
        $points = 0;
        $positive = [];
        $negative = [];

        // HTTP reachability (10)
        if ($a->http_status === 200) {
            $points += 10;
            $positive[] = 'Website erreichbar (HTTP 200)';
        } else {
            $negative[] = 'HTTP-Status '.($a->http_status ?? '—');
        }

        // HTTPS (10)
        if ($a->final_url && str_starts_with(strtolower((string) $a->final_url), 'https://')) {
            $points += 10;
            $positive[] = 'HTTPS aktiv';
        } else {
            $negative[] = 'Keine HTTPS-Verschlüsselung';
        }

        // Title (10)
        $titleLen = mb_strlen((string) $a->title);
        if ($titleLen >= 10 && $titleLen <= 100) {
            $points += 10;
            $positive[] = 'Aussagekräftiger Title-Tag';
        } elseif ($titleLen > 0) {
            $points += 3;
            $negative[] = $titleLen < 10 ? 'Title zu kurz' : 'Title zu lang';
        } else {
            $negative[] = 'Kein Title-Tag';
        }

        // Meta description (15)
        $metaLen = mb_strlen((string) $a->meta_description);
        if ($metaLen >= 50 && $metaLen <= 200) {
            $points += 15;
            $positive[] = 'Meta-Description vorhanden (SEO)';
        } elseif ($metaLen > 0) {
            $points += 5;
            $negative[] = $metaLen < 50 ? 'Meta-Description zu kurz' : 'Meta-Description zu lang';
        } else {
            $negative[] = 'Keine Meta-Description';
        }

        // Logo (10)
        if (! empty($a->logo_url)) {
            $points += 10;
            $positive[] = 'Logo eingebunden';
        } else {
            $negative[] = 'Kein Logo extrahierbar';
        }

        // Contact (10)
        $contact = $a->contact ?? [];
        $hasEmail = ! empty($contact['email']);
        $hasPhone = ! empty($contact['phone']);
        if ($hasEmail && $hasPhone) {
            $points += 10;
            $positive[] = 'E-Mail + Telefon auf der Seite';
        } elseif ($hasEmail || $hasPhone) {
            $points += 6;
            $positive[] = 'Kontaktdaten teilweise vorhanden';
        } else {
            $negative[] = 'Keine Kontaktdaten gefunden';
        }

        // Services (10)
        $serviceCount = is_array($a->services) ? count($a->services) : 0;
        if ($serviceCount >= 3) {
            $points += 10;
            $positive[] = $serviceCount.' Leistungen aufgelistet';
        } elseif ($serviceCount > 0) {
            $points += 4;
            $negative[] = 'Nur '.$serviceCount.' Leistungen';
        } else {
            $negative[] = 'Keine Leistungs-Liste';
        }

        // Socials (5)
        $socials = is_array($a->socials) ? array_filter($a->socials) : [];
        if (count($socials) >= 1) {
            $points += 5;
            $positive[] = count($socials).' soziale Profile verlinkt';
        } else {
            $negative[] = 'Keine sozialen Profile';
        }

        // Brand colors extraction (10)
        $colors = is_array($a->brand_colors) ? $a->brand_colors : [];
        if (count(array_unique($colors)) >= 2) {
            $points += 10;
            $positive[] = 'Markenfarben erkennbar';
        } else {
            $negative[] = 'Keine klare Markenfarben';
        }

        // Images (5)
        $imageCount = is_array($a->images) ? count($a->images) : 0;
        if ($imageCount >= 3) {
            $points += 5;
            $positive[] = $imageCount.' Bilder gefunden';
        } else {
            $negative[] = 'Wenige/keine Bilder';
        }

        // Text content (5)
        $textLen = mb_strlen((string) $a->text_content);
        if ($textLen >= 1000) {
            $points += 5;
            $positive[] = 'Ausreichender Textinhalt';
        } else {
            $negative[] = 'Wenig Textinhalt ('.$textLen.' Zeichen)';
        }

        $points = max(0, min(100, $points));

        // Linear mapping: 0-100 → 1.0-5.0 stars (0.5 steps for finer granularity)
        $stars = round((1 + ($points / 100) * 4) * 2) / 2;
        $stars = max(1.0, min(5.0, (float) $stars));

        return new WebsiteQualityResult(
            score: $points,
            stars: $stars,
            positive: $positive,
            negative: $negative,
        );
    }
}
