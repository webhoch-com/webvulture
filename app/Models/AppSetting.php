<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;
use Throwable;

/**
 * Persistent key-value store. Zwei Modi:
 *
 * 1. **Legacy/global** (group = 'legacy'): Cursor-Werte und einfache Flags,
 *    die via `AppSetting::remember(key, default)` / `AppSetting::set(key, value)`
 *    abgelegt werden. Keine Encryption.
 * 2. **Grouped** (group != 'legacy'): API-Keys und Cost-Caps, die im
 *    Dashboard verwaltet werden. is_secret=true triggert Encryption via
 *    Laravel-Crypt im Accessor/Mutator.
 *
 * Code-Pfade nutzen `SettingsRepository` für API-Keys; nur Legacy-Helper
 * (InboundMailScanner-Cursor) verwendet die statics direkt.
 */
class AppSetting extends Model
{
    protected $guarded = [];

    protected $casts = [
        'is_secret' => 'boolean',
    ];

    /**
     * Value-Accessor: bei is_secret=true entschlüsseln wir transparent.
     * Mutator: encrypt symmetrisch beim Speichern.
     */
    protected function value(): Attribute
    {
        return Attribute::make(
            get: function (?string $raw) {
                if ($raw === null) {
                    return null;
                }
                if (! $this->is_secret) {
                    return $raw;
                }
                try {
                    return Crypt::decryptString($raw);
                } catch (Throwable) {
                    // Falls jemand manuell eine Plaintext-Row angelegt hat
                    // (z.B. via SQL-Konsole), nicht crashen — Wert as-is liefern.
                    return $raw;
                }
            },
            set: function (?string $plain) {
                if ($plain === null) {
                    return ['value' => null];
                }
                if (! $this->is_secret) {
                    return ['value' => $plain];
                }

                return ['value' => Crypt::encryptString($plain)];
            },
        );
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // ─── Legacy-Static-API (InboundMailScanner u.ä.) ───────────────────────

    public static function remember(string $key, mixed $default = null): mixed
    {
        $row = static::where('group', 'legacy')->where('key', $key)->first();

        return $row?->value ?? $default;
    }

    public static function set(string $key, mixed $value): void
    {
        static::updateOrCreate(
            ['group' => 'legacy', 'key' => $key],
            ['value' => (string) $value, 'is_secret' => false],
        );
    }
}
