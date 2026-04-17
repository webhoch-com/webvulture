<?php

namespace App\Support\Enums;

enum CostProvider: string
{
    case Maps = 'maps';
    case Claude = 'claude';
    case Deploy = 'deploy';
    case Mail = 'mail';
    case Scrape = 'scrape';
    case Pexels = 'pexels';
}
