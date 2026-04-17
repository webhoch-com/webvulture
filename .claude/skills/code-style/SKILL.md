## Metadata
name: Livewire Class-Based Volt
description: Enforce class-based Livewire Volt components for all Laravel and Livewire coding tasks. Use this whenever creating, updating, refactoring, or reviewing Livewire Volt components. Always prefer single-file Volt components written with an anonymous class that extends Livewire\Volt\Component. Do not use the functional or API-based Volt style such as state(), computed(), action(), or other helper-first patterns unless the user explicitly asks for that style.

## Overview
This Skill enforces a strict coding style for Livewire Volt: all Volt components must be written as class-based single-file components.

Claude should always generate Volt components using an anonymous class that extends `Livewire\Volt\Component`, followed by the Blade markup in the same file.

This skill exists to prevent use of the functional/API-based Volt syntax. When working with Livewire, default to class-based Volt component design, traditional Livewire methods, explicit public properties, and standard lifecycle methods.

## Core Rule

When coding Livewire Volt components, always use class-based components.

Always prefer this structure:

```php
<?php

use Livewire\Volt\Component;

new class extends Component {
    public $count = 0;

    public function increment()
    {
        $this->count++;
    }
} ?>

<div>
    <h1>{{ $count }}</h1>
    <button wire:click="increment">+</button>
</div>
```

## Required Conventions

- Always use `new class extends Livewire\Volt\Component`
- Always keep Volt components single-file unless the user explicitly asks for another structure
- Always use standard class properties and methods
- Always use regular Livewire lifecycle methods such as `mount()`
- Always use explicit action methods such as `save()`, `update()`, `delete()`, `increment()`
- Always place Blade markup below the PHP class block in the same file
- Prefer clear, readable, Laravel-style code over clever abstractions
- Prefer traditional Livewire syntax over Volt helper APIs

## Forbidden by Default

Do not generate the API-based / functional Volt style unless the user explicitly requests it.

Avoid patterns like:

- `state(...)`
- `computed(...)`
- `action(...)`
- `on(...)`
- `with(...)`
- closure-driven component definitions as the default style
- helper-first Volt APIs instead of class methods and properties

If the user asks for Volt code and does not specify a style, assume class-based Volt.

## Coding Style Rules

- Use meaningful public property names
- Use typed properties when appropriate
- Use `mount()` for initialization logic
- Use dedicated methods for user actions
- Keep validation inside component methods using Laravel / Livewire conventions
- Keep business logic readable and explicit
- Prefer dependency injection or service usage in a Laravel-friendly way when needed
- Keep templates clean and easy to follow
- Follow Laravel naming conventions for methods, variables, and component intent

## Validation Pattern

When validation is needed, prefer standard Livewire class-based validation inside methods.

Example:

```php
<?php

use Livewire\Volt\Component;

new class extends Component {
    public string $title = '';
    public string $content = '';

    public function save()
    {
        $this->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
        ]);

        // Persist data...
    }
} ?>

<div>
    <input type="text" wire:model="title">
    <textarea wire:model="content"></textarea>

    <button wire:click="save">Save</button>
</div>
```

## Mount Pattern

When initialization is required, use `mount()`.

Example:

```php
<?php

use App\Models\Post;
use Livewire\Volt\Component;

new class extends Component {
    public Post $post;

    public function mount(Post $post)
    {
        $this->post = $post;
    }
} ?>

<div>
    {{ $post->title }}
</div>
```

## Refactoring Rule

When given existing Volt code that uses functional or API-based syntax, refactor it into class-based Volt unless the user explicitly says not to.

Refactoring priorities:
1. Convert helper-based state into class properties
2. Convert closures into named class methods
3. Move initialization into `mount()`
4. Preserve behavior exactly
5. Keep the component as a single-file Volt component

## Response Behavior

When generating Livewire code:
- default to class-based Volt
- output production-ready Laravel code
- do not present API-based Volt as an equal alternative
- only mention the functional Volt style if the user explicitly asks about it or provides existing code in that style

When reviewing code:
- flag any use of functional/API-based Volt syntax
- recommend conversion to class-based Volt
- explain fixes in terms of maintainability, readability, and consistency

## When the User Says “Livewire Component”

Assume they want:
- a class-based Volt component if Volt is being used
- standard Livewire class semantics
- no API-style Volt helpers

If there is ambiguity, still default to class-based Volt.

## Good Output Example

```php
<?php

use Livewire\Volt\Component;

new class extends Component {
    public int $count = 0;

    public function increment(): void
    {
        $this->count++;
    }

    public function decrement(): void
    {
        $this->count--;
    }
} ?>

<div class="flex items-center gap-2">
    <button wire:click="decrement" type="button">-</button>
    <span>{{ $count }}</span>
    <button wire:click="increment" type="button">+</button>
</div>
```

## Bad Output Example

Do not default to this style:

```php
<?php

use function Livewire\Volt\{state};

state(['count' => 0]);

$increment = fn () => $this->count++;
?>

<div>
    <h1>{{ $count }}</h1>
    <button wire:click="increment">+</button>
</div>
```

## Summary

For all Livewire Volt work, class-based is the default and required style.

Use:
- anonymous classes
- `extends Livewire\Volt\Component`
- explicit properties
- explicit methods
- single-file Volt structure

Do not use:
- API-based Volt helpers
- functional Volt style
- closure-first component definitions

Only break this rule if the user explicitly requests the functional/API-based Volt approach.
