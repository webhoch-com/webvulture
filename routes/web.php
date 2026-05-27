<?php

use App\Http\Controllers\LeadExportController;
use App\Http\Controllers\Webhooks\BuildCompletedController;
use App\Http\Controllers\Webhooks\GenerationCompletedController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Livewire\Volt\Volt;

// ─── Public auth routes ──────────────────────────────────────────────────────

Volt::route('/login', 'auth.login')
    ->middleware(['guest', 'throttle:login'])
    ->name('login');

Route::post('/logout', function () {
    Auth::logout();
    request()->session()->invalidate();
    request()->session()->regenerateToken();

    return redirect()->route('login');
})->middleware('auth')->name('logout');

// ─── Protected app routes ────────────────────────────────────────────────────

Route::middleware('auth')->group(function () {
    Volt::route('/', 'dashboard')->name('dashboard');
    Volt::route('/search', 'search.index')
        ->middleware('throttle:discovery')
        ->name('search');
    Volt::route('/leads', 'leads.index')->name('leads.index');
    Route::get('/leads/export.csv', LeadExportController::class)
        ->middleware('throttle:30,1')
        ->name('leads.export');
    Volt::route('/leads/{lead}', 'leads.show')->name('leads.show');
    Volt::route('/leads/{lead}/prototype', 'prototype.review')->name('prototype.review');
    Volt::route('/templates', 'templates.index')->name('templates.index');
    Volt::route('/settings', 'settings.index')->name('settings.index');
});

// ─── Generator webhooks (HMAC signed, CSRF excluded in bootstrap/app.php) ────

Route::post('/webhooks/generation/completed', GenerationCompletedController::class)
    ->name('webhooks.generation.completed');
Route::post('/webhooks/build/completed', BuildCompletedController::class)
    ->name('webhooks.build.completed');
