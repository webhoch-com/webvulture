@props(['value'])

@php
    $class = $value instanceof \App\Support\Enums\LeadStatus ? $value->badgeClass() : 'badge-ghost';
    $label = $value instanceof \App\Support\Enums\LeadStatus ? $value->label() : (string) $value;
@endphp

<x-badge :value="$label" class="{{ $class }} badge-sm" />
