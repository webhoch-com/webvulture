<?php

use App\Http\Controllers\Webhooks\BuildCompletedController;
use App\Http\Controllers\Webhooks\GenerationCompletedController;
use Illuminate\Support\Facades\Route;
use Livewire\Volt\Volt;

Volt::route('/', 'dashboard')->name('dashboard');
Volt::route('/search', 'search.index')->name('search');
Volt::route('/leads', 'leads.index')->name('leads.index');
Volt::route('/leads/{lead}', 'leads.show')->name('leads.show');
Volt::route('/leads/{lead}/prototype', 'prototype.review')->name('prototype.review');

// Generator webhooks — HMAC signed, CSRF excluded in bootstrap/app.php
Route::post('/webhooks/generation/completed', GenerationCompletedController::class)
    ->name('webhooks.generation.completed');
Route::post('/webhooks/build/completed', BuildCompletedController::class)
    ->name('webhooks.build.completed');
