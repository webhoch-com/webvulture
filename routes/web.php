<?php

use Illuminate\Support\Facades\Route;
use Livewire\Volt\Volt;

Volt::route('/', 'dashboard')->name('dashboard');
Volt::route('/search', 'search.index')->name('search');
Volt::route('/leads', 'leads.index')->name('leads.index');
