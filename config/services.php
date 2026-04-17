<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google_maps' => [
        'key' => env('GOOGLE_MAPS_API_KEY'),
        'places_base' => env('GOOGLE_PLACES_BASE', 'https://places.googleapis.com/v1'),
    ],

    'google_search' => [
        'key' => env('GOOGLE_SEARCH_API_KEY'),
    ],

    'google_oauth' => [
        'client_id' => env('GOOGLE_OAUTH_CLIENT_ID'),
        'client_secret' => env('GOOGLE_OAUTH_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_OAUTH_REDIRECT', '/auth/google/callback'),
    ],

    'anthropic' => [
        'key' => env('ANTHROPIC_API_KEY'),
        'model_default' => env('ANTHROPIC_MODEL', 'claude-sonnet-4-6'),
        'model_cheap' => env('ANTHROPIC_MODEL_CHEAP', 'claude-haiku-4-5-20251001'),
    ],

    'generator' => [
        'url' => env('GENERATOR_URL', 'http://localhost:4000'),
        'secret' => env('GENERATOR_SECRET'),
    ],

    'preview_host' => [
        'root_domain' => env('PREVIEW_ROOT_DOMAIN', 'demo.webvulture.app'),
    ],

];
