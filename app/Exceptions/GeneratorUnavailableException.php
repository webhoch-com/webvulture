<?php

namespace App\Exceptions;

use RuntimeException;

class GeneratorUnavailableException extends RuntimeException
{
    public function __construct(string $reason = 'Generator service circuit is open or unhealthy.')
    {
        parent::__construct($reason);
    }
}
