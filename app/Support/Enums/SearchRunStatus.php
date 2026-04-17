<?php

namespace App\Support\Enums;

enum SearchRunStatus: string
{
    case Queued = 'queued';
    case Running = 'running';
    case Done = 'done';
    case Failed = 'failed';

    public function badgeClass(): string
    {
        return match ($this) {
            self::Queued => 'badge-ghost',
            self::Running => 'badge-info',
            self::Done => 'badge-success',
            self::Failed => 'badge-error',
        };
    }
}
