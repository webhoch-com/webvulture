@props([
    'size' => 40,
    'showText' => false,
    'variant' => 'dark',
])

@php
    $textColor = $variant === 'light' ? '#ffffff' : 'currentColor';
    // Webhoch logo source — for light variant, we apply a CSS filter to invert (logo is dark on transparent).
    $logoFilter = $variant === 'light' ? 'filter: brightness(0) invert(1);' : '';
@endphp

<div {{ $attributes->merge(['class' => 'inline-flex items-center gap-3']) }}>
    <img
        src="{{ asset('img/agency/logo-webhoch.webp') }}"
        alt="Webagentur Hochmeir e.U."
        width="{{ $size }}"
        height="{{ $size }}"
        style="height: {{ $size }}px; width: auto; {{ $logoFilter }}"
        loading="eager"
        decoding="async"
    />

    @if($showText)
        <span class="font-semibold tracking-tight text-[1.05rem]" style="color: {{ $textColor }};">WebVulture</span>
    @endif
</div>
