<?php

namespace App\Domain\Settings;

use App\Models\AppSetting;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Single source of truth for runtime-konfigurierbare App-Settings (API-Keys,
 * Cost-Caps, Mail-Settings). Liest aus DB, fällt auf `.env` zurück wenn die
 * DB-Row noch nicht existiert — so kann ein frisches Deploy laufen ohne erst
 * im UI alles eingeben zu müssen.
 *
 * Caching: 60s in-memory + Redis/file. Bei `set()` wird der Cache invalidiert.
 *
 * Die Schema-Definition steht in `SettingsSchema` — sie listet alle bekannten
 * Slots inkl. Default-`.env`-Variable und ob is_secret.
 */
class SettingsRepository
{
    private const CACHE_TTL = 60;
    private const CACHE_KEY = 'settings.snapshot.v1';

    public function get(string $group, string $key, ?string $default = null): ?string
    {
        $all = $this->all();
        $val = $all[$group][$key] ?? null;
        if ($val !== null && $val !== '') {
            return $val;
        }

        // Fallback: config-Wert (kommt aus config/services.php, das wiederum
        // env() liest). Den Umweg machen wir bewusst — env() direkt aufrufen
        // funktioniert NACH `config:cache` nicht mehr, weil der Cache `env()`
        // nicht mit-included. config('…') ist auch nach Cache zuverlässig.
        $configKey = SettingsSchema::configKey($group, $key);
        if ($configKey) {
            $configValue = config($configKey);
            if ($configValue !== null && $configValue !== '') {
                return (string) $configValue;
            }
        }

        return $default;
    }

    /**
     * @return array<string, array<string, string|null>>  group → key → value
     */
    public function all(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            $rows = AppSetting::query()
                ->whereNot('group', 'legacy')
                ->get(['group', 'key', 'value', 'is_secret']);

            $out = [];
            foreach ($rows as $row) {
                $out[$row->group][$row->key] = $row->value;
            }

            return $out;
        });
    }

    public function set(string $group, string $key, ?string $value, ?User $user = null): AppSetting
    {
        $isSecret = SettingsSchema::isSecret($group, $key);

        $row = AppSetting::updateOrCreate(
            ['group' => $group, 'key' => $key],
            [
                'value' => $value,
                'is_secret' => $isSecret,
                'updated_by' => $user?->id,
            ],
        );

        $this->forget();

        return $row;
    }

    /**
     * Bulk-set aus dem Settings-Form. Akzeptiert `[group => [key => value]]`.
     * Skippt Slots wo der User nichts geändert hat (Leerstring oder ••••• Marker).
     */
    public function bulkSet(array $payload, ?User $user = null): int
    {
        $count = 0;
        foreach ($payload as $group => $kvs) {
            if (! is_array($kvs)) {
                continue;
            }
            foreach ($kvs as $key => $value) {
                if ($value === null || $value === '' || $value === SettingsSchema::SECRET_PLACEHOLDER) {
                    continue;
                }
                $this->set($group, $key, (string) $value, $user);
                $count++;
            }
        }

        return $count;
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Returns the value or placeholder for UI rendering. Wenn is_secret und
     * Wert vorhanden, geben wir nicht den Klartext zurück sondern das
     * SECRET_PLACEHOLDER — der User muss explizit "show" klicken oder einen
     * neuen Wert eingeben.
     */
    public function getForUi(string $group, string $key): ?string
    {
        $value = $this->get($group, $key);
        if ($value === null || $value === '') {
            return null;
        }
        if (SettingsSchema::isSecret($group, $key)) {
            return SettingsSchema::SECRET_PLACEHOLDER;
        }

        return $value;
    }

    /**
     * @return Collection<int, array{group:string,key:string,label:string,is_secret:bool,present:bool,source:string}>
     */
    public function statusList(): Collection
    {
        return collect(SettingsSchema::all())->map(function (array $slot) {
            $val = $this->get($slot['group'], $slot['key']);
            $present = $val !== null && $val !== '';

            // source: db wenn Row existiert UND nicht-leer, env wenn null in DB
            // aber env gesetzt, missing sonst.
            $dbRow = AppSetting::where('group', $slot['group'])->where('key', $slot['key'])->first();
            $source = match (true) {
                $dbRow && $dbRow->value !== null && $dbRow->value !== '' => 'db',
                $present => 'env',
                default => 'missing',
            };

            return [
                'group' => $slot['group'],
                'key' => $slot['key'],
                'label' => $slot['label'],
                'is_secret' => $slot['is_secret'],
                'present' => $present,
                'source' => $source,
            ];
        });
    }
}
