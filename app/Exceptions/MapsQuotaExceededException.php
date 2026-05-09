<?php

namespace App\Exceptions;

use RuntimeException;

class MapsQuotaExceededException extends RuntimeException
{
    public function __construct(string $message = 'Google Maps API quota or rate-limit reached.')
    {
        parent::__construct($message);
    }
}
