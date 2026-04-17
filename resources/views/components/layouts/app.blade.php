<!DOCTYPE html>
<html lang="en" data-theme="webvulture" class="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'WebVulture' }}</title>
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700|jetbrains-mono:400,600" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-base-200 font-sans antialiased">

<x-nav sticky full-width class="bg-base-100 border-b border-base-300/60">
    <x-slot:brand>
        <a href="{{ route('dashboard') }}" class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary grid place-items-center font-bold text-primary-content">W</div>
            <span class="font-semibold tracking-tight">WebVulture</span>
        </a>
    </x-slot:brand>
    <x-slot:actions>
        <x-button label="Dashboard" icon="o-squares-2x2" link="{{ route('dashboard') }}" class="btn-ghost btn-sm" />
        <x-button label="Search" icon="o-magnifying-glass" link="{{ route('search') }}" class="btn-ghost btn-sm" />
        <x-button label="Leads" icon="o-users" link="{{ route('leads.index') }}" class="btn-ghost btn-sm" />
        <x-theme-toggle class="btn btn-circle btn-ghost btn-sm" />
    </x-slot:actions>
</x-nav>

<x-main full-width>
    <x-slot:content>
        <div class="max-w-7xl mx-auto p-6">
            {{ $slot }}
        </div>
    </x-slot:content>
</x-main>

<x-toast />
</body>
</html>
