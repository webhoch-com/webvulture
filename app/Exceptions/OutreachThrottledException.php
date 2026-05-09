<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Raised when an outbound outreach mail is blocked by the per-domain
 * cooldown or the daily cap. Caller (Volt component) catches this and
 * shows a friendly toast to the user instead of bubbling 500.
 */
class OutreachThrottledException extends RuntimeException
{
    public string $reason;

    public static function dailyCapReached(int $sentToday, int $cap): self
    {
        $e = new self("Tagescap erreicht: {$sentToday} von {$cap} Mails heute versendet.");
        $e->reason = 'daily_cap';

        return $e;
    }

    public static function domainCooldown(string $domain, int $windowSeconds): self
    {
        $e = new self("Domain {$domain} braucht {$windowSeconds}s Pause zwischen Mails.");
        $e->reason = 'domain_cooldown';

        return $e;
    }
}
