<?php

namespace App\Support\Enums;

enum LeadStatus: string
{
    case New = 'new';
    case Scraped = 'scraped';
    case Enriched = 'enriched';
    case Prototyped = 'prototyped';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Irrelevant = 'irrelevant';
    case Sent = 'sent';
    case Replied = 'replied';

    public function badgeClass(): string
    {
        return match ($this) {
            self::New => 'badge-ghost',
            self::Scraped => 'badge-info',
            self::Enriched => 'badge-accent',
            self::Prototyped => 'badge-primary',
            self::Approved => 'badge-success',
            self::Rejected => 'badge-error',
            self::Irrelevant => 'badge-neutral',
            self::Sent => 'badge-warning',
            self::Replied => 'badge-success badge-outline',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::New => 'Neu',
            self::Scraped => 'Gescraped',
            self::Enriched => 'Angereichert',
            self::Prototyped => 'Prototyp ✓',
            self::Approved => 'Freigegeben',
            self::Rejected => 'Abgelehnt',
            self::Irrelevant => 'Irrelevant',
            self::Sent => 'Versendet',
            self::Replied => 'Beantwortet',
        };
    }
}
