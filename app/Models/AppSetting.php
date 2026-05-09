<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Persistent key-value store for app-wide settings that must survive cache eviction.
 * Use AppSetting::remember(key, default) and AppSetting::set(key, value).
 */
class AppSetting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    public static function remember(string $key, mixed $default = null): mixed
    {
        $row = static::find($key);
        return $row?->value ?? $default;
    }

    public static function set(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
