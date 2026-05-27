<?php

namespace App\Domain\Settings;

/**
 * Declarative Schema aller App-Settings die im UI verwaltbar sind.
 *
 * Jeder Slot enthält:
 *   - group       (z.B. 'services.anthropic') — passt zur Config-Key-Hierarchie
 *   - key         (z.B. 'api_key')
 *   - label       (deutsch, für UI)
 *   - is_secret   (true → encrypted in DB, im UI maskiert)
 *   - env         (Fallback-Env-Variable wenn DB-Row leer ist)
 *   - config_key  (Laravel-Config-Pfad den der ServiceProvider patcht)
 *   - section     (UI-Tab: 'api_keys' | 'cost_caps' | 'mail' | 'imap' | 'general')
 *
 * Zentral, damit Code/UI/Service-Provider nicht 5x dieselbe Liste pflegen.
 */
class SettingsSchema
{
    public const SECRET_PLACEHOLDER = '••••••••';

    /**
     * @return list<array{group:string,key:string,label:string,is_secret:bool,env:?string,config_key:?string,section:string,help?:string}>
     */
    public static function all(): array
    {
        return [
            // ─── API-Keys ────────────────────────────────────────────────
            [
                'group' => 'services.anthropic',
                'key' => 'api_key',
                'label' => 'Anthropic API-Key',
                'is_secret' => true,
                'env' => 'ANTHROPIC_API_KEY',
                'config_key' => 'services.anthropic.key',
                'section' => 'api_keys',
                'help' => 'Für Lead-Enrichment + Site-Generation. Beginnt mit "sk-ant-".',
            ],
            [
                'group' => 'services.anthropic',
                'key' => 'model_default',
                'label' => 'Anthropic Modell (Standard)',
                'is_secret' => false,
                'env' => 'ANTHROPIC_MODEL_DEFAULT',
                'config_key' => 'services.anthropic.model_default',
                'section' => 'api_keys',
                'help' => 'Default: claude-sonnet-4-6',
            ],
            [
                'group' => 'services.anthropic',
                'key' => 'model_cheap',
                'label' => 'Anthropic Modell (Cheap)',
                'is_secret' => false,
                'env' => 'ANTHROPIC_MODEL_CHEAP',
                'config_key' => 'services.anthropic.model_cheap',
                'section' => 'api_keys',
                'help' => 'Für kleine Aufgaben. Default: claude-haiku-4-5-20251001',
            ],
            [
                'group' => 'services.openai',
                'key' => 'api_key',
                'label' => 'OpenAI API-Key',
                'is_secret' => true,
                'env' => 'OPENAI_API_KEY',
                'config_key' => 'services.openai.key',
                'section' => 'api_keys',
                'help' => 'Optional — aktuell nur Fallback-Provider.',
            ],
            [
                'group' => 'services.google_maps',
                'key' => 'api_key',
                'label' => 'Google Places API-Key',
                'is_secret' => true,
                'env' => 'GOOGLE_MAPS_API_KEY',
                'config_key' => 'services.google_maps.key',
                'section' => 'api_keys',
                'help' => 'Für Discovery via Google Places. Beginnt mit "AIzaSy".',
            ],
            [
                'group' => 'services.generator',
                'key' => 'url',
                'label' => 'Generator-Service URL',
                'is_secret' => false,
                'env' => 'GENERATOR_URL',
                'config_key' => 'services.generator.url',
                'section' => 'api_keys',
                'help' => 'Default: http://127.0.0.1:4000',
            ],
            [
                'group' => 'services.generator',
                'key' => 'secret',
                'label' => 'Generator HMAC-Secret',
                'is_secret' => true,
                'env' => 'GENERATOR_SECRET',
                'config_key' => 'services.generator.secret',
                'section' => 'api_keys',
                'help' => 'Signiert Webhook-Callbacks vom Node-Service. Muss in beiden .env identisch sein.',
            ],

            // ─── Cost-Caps ───────────────────────────────────────────────
            [
                'group' => 'services.cost_caps',
                'key' => 'daily_eur',
                'label' => 'Tageslimit (EUR)',
                'is_secret' => false,
                'env' => 'COST_DAILY_CAP_EUR',
                'config_key' => 'services.cost_caps.daily_eur',
                'section' => 'cost_caps',
                'help' => 'Hartes Limit für alle Anbieter zusammen. Default: 20.',
            ],
            [
                'group' => 'services.cost_caps',
                'key' => 'per_lead_eur',
                'label' => 'Pro-Lead-Limit (EUR)',
                'is_secret' => false,
                'env' => 'COST_PER_LEAD_CAP_EUR',
                'config_key' => 'services.cost_caps.per_lead_eur',
                'section' => 'cost_caps',
                'help' => 'Max Kosten für Enrichment+Generation pro Lead. Default: 2.',
            ],
            [
                'group' => 'services.cost_caps',
                'key' => 'usd_to_eur',
                'label' => 'USD→EUR Umrechnung',
                'is_secret' => false,
                'env' => 'USD_TO_EUR',
                'config_key' => 'services.cost_caps.usd_to_eur',
                'section' => 'cost_caps',
                'help' => 'Wechselkurs, quartalsweise aktualisieren. Default: 0.93.',
            ],

            // ─── Mail (Outreach) ─────────────────────────────────────────
            [
                'group' => 'mail',
                'key' => 'from_address',
                'label' => 'Absender-Email',
                'is_secret' => false,
                'env' => 'MAIL_FROM_ADDRESS',
                'config_key' => 'mail.from.address',
                'section' => 'mail',
            ],
            [
                'group' => 'mail',
                'key' => 'from_name',
                'label' => 'Absender-Name',
                'is_secret' => false,
                'env' => 'MAIL_FROM_NAME',
                'config_key' => 'mail.from.name',
                'section' => 'mail',
            ],
            [
                'group' => 'mail.mailers.smtp',
                'key' => 'host',
                'label' => 'SMTP-Host',
                'is_secret' => false,
                'env' => 'MAIL_HOST',
                'config_key' => 'mail.mailers.smtp.host',
                'section' => 'mail',
            ],
            [
                'group' => 'mail.mailers.smtp',
                'key' => 'port',
                'label' => 'SMTP-Port',
                'is_secret' => false,
                'env' => 'MAIL_PORT',
                'config_key' => 'mail.mailers.smtp.port',
                'section' => 'mail',
            ],
            [
                'group' => 'mail.mailers.smtp',
                'key' => 'username',
                'label' => 'SMTP-Username',
                'is_secret' => false,
                'env' => 'MAIL_USERNAME',
                'config_key' => 'mail.mailers.smtp.username',
                'section' => 'mail',
            ],
            [
                'group' => 'mail.mailers.smtp',
                'key' => 'password',
                'label' => 'SMTP-Passwort',
                'is_secret' => true,
                'env' => 'MAIL_PASSWORD',
                'config_key' => 'mail.mailers.smtp.password',
                'section' => 'mail',
            ],

            // ─── IMAP (Reply-Scanning) ───────────────────────────────────
            [
                'group' => 'services.imap',
                'key' => 'host',
                'label' => 'IMAP-Host',
                'is_secret' => false,
                'env' => 'IMAP_HOST',
                'config_key' => 'services.imap.host',
                'section' => 'imap',
            ],
            [
                'group' => 'services.imap',
                'key' => 'username',
                'label' => 'IMAP-Username',
                'is_secret' => false,
                'env' => 'IMAP_USERNAME',
                'config_key' => 'services.imap.username',
                'section' => 'imap',
            ],
            [
                'group' => 'services.imap',
                'key' => 'password',
                'label' => 'IMAP-Passwort',
                'is_secret' => true,
                'env' => 'IMAP_PASSWORD',
                'config_key' => 'services.imap.password',
                'section' => 'imap',
            ],
        ];
    }

    /**
     * Lookup für einen Slot anhand group+key, oder null falls unbekannt.
     */
    public static function find(string $group, string $key): ?array
    {
        foreach (self::all() as $slot) {
            if ($slot['group'] === $group && $slot['key'] === $key) {
                return $slot;
            }
        }

        return null;
    }

    public static function envKey(string $group, string $key): ?string
    {
        return self::find($group, $key)['env'] ?? null;
    }

    public static function configKey(string $group, string $key): ?string
    {
        return self::find($group, $key)['config_key'] ?? null;
    }

    public static function isSecret(string $group, string $key): bool
    {
        return (bool) (self::find($group, $key)['is_secret'] ?? false);
    }

    public static function sections(): array
    {
        return [
            'api_keys' => 'API-Keys',
            'cost_caps' => 'Kosten-Limits',
            'mail' => 'Mail (Outreach)',
            'imap' => 'IMAP (Reply-Scanning)',
        ];
    }
}
