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

    'openai' => [
        'key' => env('OPENAI_API_KEY'),
        'model_default' => env('OPENAI_MODEL', 'gpt-4o'),
        'model_cheap' => env('OPENAI_MODEL_CHEAP', 'gpt-4o-mini'),
        'base' => env('OPENAI_API_BASE', 'https://api.openai.com/v1'),
    ],

    'llm' => [
        'default' => env('LLM_PROVIDER_DEFAULT', 'anthropic'),
    ],

    'generator' => [
        'url' => env('GENERATOR_URL', 'http://localhost:4000'),
        'secret' => env('GENERATOR_SECRET'),
        'webhook_max_age' => env('GENERATOR_WEBHOOK_MAX_AGE', 300),
        'health_cache_ttl' => env('GENERATOR_HEALTH_TTL', 30),
        'circuit_open_seconds' => env('GENERATOR_CIRCUIT_OPEN_SECONDS', 300),
        'circuit_failure_threshold' => env('GENERATOR_CIRCUIT_THRESHOLD', 3),
    ],

    'preview_host' => [
        'root_domain' => env('PREVIEW_ROOT_DOMAIN', 'demo.webvulture.app'),
    ],

    'imap' => [
        'host' => env('IMAP_HOST', ''),
        'port' => env('IMAP_PORT', 993),
        'username' => env('IMAP_USERNAME', ''),
        'password' => env('IMAP_PASSWORD', ''),
        'encryption' => env('IMAP_ENCRYPTION', 'ssl'),
        'folder' => env('IMAP_FOLDER', 'INBOX'),
        'mark_seen' => env('IMAP_MARK_SEEN', false),
        'validate_cert' => env('IMAP_VALIDATE_CERT', true),
    ],

    'storage' => [
        'projects_dir' => env('PROJECTS_DIR', '/tmp/wv-projects'),
        'artifacts_dir' => env('ARTIFACTS_DIR', '/tmp/wv-artifacts'),
    ],

    'browsershot' => [
        'chrome_path' => env('CHROME_PATH'),
        'node_binary' => env('NODE_BINARY', 'node'),
    ],

    'outreach' => [
        // Anti-spam-folder: hold each recipient *domain* to one outbound mail
        // per N seconds (so a list with 5 contacts at firma.com doesn't fire
        // five mails in two seconds), and cap total daily outbound regardless
        // of recipient (so a slip-up in bulk-send never floods the ESP).
        // Both can be overridden via env without redeploy.
        'throttle' => [
            'domain_window_seconds' => env('OUTREACH_DOMAIN_WINDOW_SECONDS', 30),
            'daily_cap' => env('OUTREACH_DAILY_CAP', 50),
        ],
    ],

    'cost_caps' => [
        // Currency: EUR everywhere. USD env var names retained for backwards
        // compatibility with deployed .env files but treated as EUR amounts —
        // the new env names below take precedence.
        'daily_eur' => env('COST_CAP_DAILY_EUR', env('COST_CAP_DAILY_USD', 20)),
        'per_lead_eur' => env('COST_CAP_PER_LEAD_EUR', env('COST_CAP_PER_LEAD_USD', 2)),
        // Static USD→EUR rate applied to LLM provider cost (Anthropic + OpenAI
        // publish in USD). Adjust quarterly based on accounting if FX drifts
        // significantly. Default conservative.
        'usd_to_eur' => env('USD_TO_EUR_RATE', 0.93),
    ],

];
