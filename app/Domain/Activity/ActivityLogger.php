<?php

namespace App\Domain\Activity;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Schreibt Audit-Log-Einträge für nachvollziehbare User-Aktionen.
 * Wird aus Volt-Komponenten und Service-Klassen aufgerufen.
 *
 * Aufruf-Stil:
 *   app(ActivityLogger::class)->log($lead, 'scraped', 'Scrape gestartet');
 *
 * Wenn user=null wird `auth()->user()` benutzt — explizit `null` als drittes
 * Argument übergeben, wenn die Action vom System (z.B. Cron) ausgelöst wird.
 */
class ActivityLogger
{
    public function log(
        Model $subject,
        string $action,
        ?string $description = null,
        array $meta = [],
        ?User $user = null,
    ): ActivityLog {
        return ActivityLog::create([
            'subject_type' => $subject::class,
            'subject_id' => $subject->getKey(),
            'user_id' => ($user ?? auth()->user())?->id,
            'action' => $action,
            'description' => $description,
            'meta' => $meta ?: null,
        ]);
    }
}
