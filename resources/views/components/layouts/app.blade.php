<!DOCTYPE html>
<html lang="de" data-theme="webvulture" style="color-scheme: light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'WebVulture' }}</title>
    <link rel="icon" type="image/x-icon" href="{{ asset('favicon.ico') }}">
    <link rel="apple-touch-icon" href="{{ asset('img/agency/logo-webhoch.webp') }}">
    <meta name="robots" content="noindex, nofollow">
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700,800|fraunces:400,500,600|jetbrains-mono:400,500,600" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen font-sans antialiased" style="background:#fafafa;color:#0a0a0a;">

<x-nav sticky full-width class="bg-base-100 border-b border-base-300/60">
    <x-slot:brand>
        <a href="{{ route('dashboard') }}" class="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src="{{ asset('img/agency/logo-webhoch.webp') }}"
                 alt="Webagentur Hochmeir e.U."
                 class="dark:invert h-7 w-auto shrink-0 hidden md:block"
                 loading="eager" decoding="async" />
            <span class="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary text-white font-bold text-sm shrink-0">W</span>
            <span class="text-base-content/30 hidden md:inline">·</span>
            <span class="font-semibold tracking-tight truncate">WebVulture</span>
        </a>
    </x-slot:brand>

    {{-- Mobile burger trigger (only < md) --}}
    <x-slot:actions>
        {{-- Desktop nav (hidden on mobile) --}}
        <div class="!hidden md:!flex items-center gap-1">
            <a href="{{ route('dashboard') }}" class="btn btn-ghost btn-sm gap-1">
                <x-icon name="o-squares-2x2" class="w-4 h-4" />
                <span>Übersicht</span>
            </a>
            <a href="{{ route('search') }}" class="btn btn-ghost btn-sm gap-1">
                <x-icon name="o-magnifying-glass" class="w-4 h-4" />
                <span>Suche</span>
            </a>
            <a href="{{ route('leads.index') }}" class="btn btn-ghost btn-sm gap-1">
                <x-icon name="o-users" class="w-4 h-4" />
                <span>Leads</span>
            </a>
            <a href="{{ route('templates.index') }}" class="btn btn-ghost btn-sm gap-1">
                <x-icon name="o-square-3-stack-3d" class="w-4 h-4" />
                <span>Vorlagen</span>
            </a>
            @auth
                @if (auth()->user()->isAdmin())
                    <a href="{{ route('settings.index') }}" class="btn btn-ghost btn-sm gap-1">
                        <x-icon name="o-cog-6-tooth" class="w-4 h-4" />
                        <span>Einstellungen</span>
                    </a>
                    <a href="{{ route('users.index') }}" class="btn btn-ghost btn-sm gap-1">
                        <x-icon name="o-user-group" class="w-4 h-4" />
                        <span>Team</span>
                    </a>
                @endif
                <span class="text-xs text-base-content/60 hidden lg:inline ml-2">{{ auth()->user()->email }}</span>
                <form method="POST" action="{{ route('logout') }}" class="inline">
                    @csrf
                    <button type="submit" class="btn btn-ghost btn-sm" title="Abmelden" aria-label="Abmelden">
                        <x-icon name="o-arrow-right-on-rectangle" class="w-4 h-4" />
                    </button>
                </form>
            @endauth
        </div>

        {{-- Mobile burger (only < md) --}}
        <div class="!flex md:!hidden items-center gap-1">
            <label for="wv-mobile-drawer" class="btn btn-ghost btn-square min-h-[44px] min-w-[44px] h-11 w-11" aria-label="Menü öffnen">
                <x-icon name="o-bars-3" class="w-5 h-5" />
            </label>
        </div>
    </x-slot:actions>
</x-nav>

{{-- Mobile drawer --}}
<div class="drawer drawer-end !block md:!hidden">
    <input id="wv-mobile-drawer" type="checkbox" class="drawer-toggle" />
    <div class="drawer-side z-50">
        <label for="wv-mobile-drawer" aria-label="Menü schließen" class="drawer-overlay"></label>
        <aside class="min-h-full w-72 bg-base-100 p-4 flex flex-col gap-1">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-base-300/60">
                <span class="font-semibold tracking-tight">Menü</span>
                <label for="wv-mobile-drawer" class="btn btn-ghost btn-square min-h-[44px] min-w-[44px] h-11 w-11" aria-label="Schließen">
                    <x-icon name="o-x-mark" class="w-5 h-5" />
                </label>
            </div>
            <a href="{{ route('dashboard') }}" class="btn btn-ghost justify-start gap-2">
                <x-icon name="o-squares-2x2" class="w-5 h-5" /> Übersicht
            </a>
            <a href="{{ route('search') }}" class="btn btn-ghost justify-start gap-2">
                <x-icon name="o-magnifying-glass" class="w-5 h-5" /> Suche
            </a>
            <a href="{{ route('leads.index') }}" class="btn btn-ghost justify-start gap-2">
                <x-icon name="o-users" class="w-5 h-5" /> Leads
            </a>
            <a href="{{ route('templates.index') }}" class="btn btn-ghost justify-start gap-2">
                <x-icon name="o-square-3-stack-3d" class="w-5 h-5" /> Vorlagen
            </a>
            @auth
                @if (auth()->user()->isAdmin())
                    <a href="{{ route('settings.index') }}" class="btn btn-ghost justify-start gap-2">
                        <x-icon name="o-cog-6-tooth" class="w-5 h-5" /> Einstellungen
                    </a>
                    <a href="{{ route('users.index') }}" class="btn btn-ghost justify-start gap-2">
                        <x-icon name="o-user-group" class="w-5 h-5" /> Team
                    </a>
                @endif
            @endauth
            @auth
                <div class="mt-auto pt-3 border-t border-base-300/60">
                    <div class="text-xs text-base-content/60 mb-2 px-2 truncate">{{ auth()->user()->email }}</div>
                    <form method="POST" action="{{ route('logout') }}">
                        @csrf
                        <button type="submit" class="btn btn-ghost btn-sm w-full justify-start gap-2">
                            <x-icon name="o-arrow-right-on-rectangle" class="w-5 h-5" /> Abmelden
                        </button>
                    </form>
                </div>
            @endauth
        </aside>
    </div>
</div>

<x-main full-width>
    <x-slot:content>
        <div class="max-w-7xl mx-auto p-4 md:p-6">
            {{ $slot }}
        </div>
    </x-slot:content>
</x-main>

<x-toast />
</body>
</html>
