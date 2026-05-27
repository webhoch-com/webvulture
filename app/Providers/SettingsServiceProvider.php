<?php

namespace App\Providers;

use App\Domain\Settings\SettingsRepository;
use App\Domain\Settings\SettingsSchema;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Throwable;

/**
 * Patcht zur Boot-Zeit die Laravel-Config-Werte mit den DB-Settings —
 * `config('services.anthropic.key')` liefert dann den Dashboard-Wert
 * wenn vorhanden, sonst .env (Schema-Default).
 *
 * Die DB-Abfrage ist defensiv: wenn die Tabelle noch nicht migriert ist
 * (Erstinstallation, vor `migrate`), wird der Provider geräuschlos
 * geskippt — App startet weiter mit .env-only.
 *
 * Caching: SettingsRepository::all() cached 60s — ein einziger SELECT
 * pro Request-Burst.
 */
class SettingsServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(SettingsRepository::class);
    }

    public function boot(Application $app): void
    {
        // Skip in Konsolen-Migrations-Modus: `php artisan migrate` würde
        // sonst eine Endlosschleife auslösen wenn die Tabelle noch nicht
        // existiert. `--no-interaction` und CLI sind hier Heuristik.
        if ($app->runningInConsole() && ! $app->environment('testing')) {
            // In console-environment ist das Caching unnötig riskant
            // (verschiedene Commands, evtl. Migrations). Lass es trotzdem
            // greifen, aber mit try/catch.
        }

        try {
            if (! Schema::hasTable('app_settings')) {
                return;
            }
        } catch (Throwable) {
            return; // DB nicht erreichbar — App soll trotzdem booten.
        }

        try {
            $repo = $app->make(SettingsRepository::class);
            $snapshot = $repo->all();
        } catch (QueryException) {
            return; // Schema möglicherweise noch alte Version (Migration pending)
        }

        foreach (SettingsSchema::all() as $slot) {
            $configKey = $slot['config_key'] ?? null;
            if (! $configKey) {
                continue;
            }
            $value = $snapshot[$slot['group']][$slot['key']] ?? null;
            if ($value === null || $value === '') {
                continue;
            }
            // Casten für numerische Cost-Caps (sonst kommen sie als strings
            // raus dem `text`-Feld und brechen z.B. `(int) config('...')`).
            if (in_array($slot['key'], ['daily_eur', 'per_lead_eur', 'usd_to_eur', 'port'], true)) {
                $value = is_numeric($value) ? (float) $value : $value;
            }
            config([$configKey => $value]);
        }
    }
}
