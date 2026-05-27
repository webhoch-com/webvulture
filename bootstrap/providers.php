<?php

use App\Providers\AppServiceProvider;
use App\Providers\SettingsServiceProvider;
use App\Providers\VoltServiceProvider;

return [
    AppServiceProvider::class,
    // SettingsServiceProvider muss VOR den Services kommen die die Config
    // lesen — z.B. wenn ein Job-Handler `config('services.anthropic.key')`
    // im constructor evaluiert.
    SettingsServiceProvider::class,
    VoltServiceProvider::class,
];
