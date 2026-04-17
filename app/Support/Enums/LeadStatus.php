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
            self::Sent => 'badge-warning',
            self::Replied => 'badge-success badge-outline',
        };
    }

    public function label(): string
    {
        return ucfirst($this->value);
    }
}
