<?php

use App\Jobs\MarkAwaitingResponseJob;
use App\Jobs\ScanInboundRepliesJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Once per day at 06:00 — flag leads where outreach is >7d old and no reply yet.
Schedule::job(new MarkAwaitingResponseJob)
    ->dailyAt('06:00')
    ->name('mark-awaiting-response')
    ->withoutOverlapping();

// Every 15 min — scan IMAP inbox for replies to outreach messages and auto-mark Lead replied.
// No-op until IMAP_HOST is configured in .env, so dev/staging stays quiet.
Schedule::job(new ScanInboundRepliesJob, 'default')
    ->everyFifteenMinutes()
    ->name('scan-inbound-replies')
    ->onOneServer()
    ->withoutOverlapping(20);
