<?php

namespace App\Exceptions;

use RuntimeException;

class CostCapExceededException extends RuntimeException
{
    public static function daily(int $spentCents, int $capCents): self
    {
        return new self(sprintf(
            'Daily cost cap exceeded: spent %s of %s cap (EUR).',
            self::eur($spentCents),
            self::eur($capCents),
        ));
    }

    public static function perLead(int $leadId, int $spentCents, int $capCents): self
    {
        return new self(sprintf(
            'Per-lead cost cap exceeded for lead %d: spent %s of %s cap (EUR).',
            $leadId,
            self::eur($spentCents),
            self::eur($capCents),
        ));
    }

    private static function eur(int $cents): string
    {
        return number_format($cents / 100, 2, ',', '.').' €';
    }
}
