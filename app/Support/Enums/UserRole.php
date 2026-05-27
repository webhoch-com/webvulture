<?php

namespace App\Support\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Member = 'member';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrator',
            self::Member => 'Mitarbeiter',
        };
    }

    /** Darf der User Settings ändern + andere User verwalten? */
    public function canManageOrg(): bool
    {
        return $this === self::Admin;
    }
}
