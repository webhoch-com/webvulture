<?php

namespace App\Domain\Quality;

class WebsiteQualityResult
{
    public function __construct(
        public readonly int $score,
        public readonly float $stars,
        /** @var list<string> */
        public readonly array $positive,
        /** @var list<string> */
        public readonly array $negative,
    ) {}

    public function isHighQuality(): bool
    {
        return $this->stars >= 4.0;
    }
}
