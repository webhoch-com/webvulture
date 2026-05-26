# WebVulture — Project Conventions for Claude

Diese Datei ergänzt die globalen Anweisungen aus `~/.claude/CLAUDE.md`. Hier projekt-spezifische Konventionen — gilt für jede Session in diesem Repo.

## Frontend-Konvention

- **Volt-First**: Neue UI-Komponenten als Single-File Volt-Dateien unter `resources/views/livewire/`. Klassische Livewire-Komponenten unter `app/Livewire/` nur, wenn Volt das nicht abdeckt (Forms, große State-Machines).
- **MaryUI-only**: Verwende ausschließlich `<x-mary-...>` / `<x-...>` aus `robsontenorio/mary`. Kein rohes Tailwind-HTML, keine fremden Komponenten-Libs.
- **Sprache**: UI-Texte auf **Deutsch (Zielgruppe Österreich)**. Sie-Form, AT-tauglich. Code-Bezeichner und Kommentare auf Englisch.
- **Zahlen-/Geld-Format**: `number_format($v, 2, ',', '.').' €'` (DE-Konvention). Keine `$`-Zeichen, keine 4 Decimals.
- **Live-Updates**: `wire:poll` ist verboten. Stattdessen Reverb-Broadcast via `LeadStatusChanged`/`JobProgressUpdated` + `#[On('lead-updated')]` in der Volt-Komponente.

## i18n-Roadmap (DE → DE+EN)

**Aktueller Zustand (Stand 2026-05-07):** UI-Texte sind hardcoded auf Deutsch. `APP_LOCALE=de`, `lang/de.json` für Validation-Messages, `lang/en.json` als Stub-Fallback.

**Wenn Englisch zugeschaltet werden soll:**
1. Alle UI-Strings in Volt-Files via `__('Schlüssel')` wrappen — Default-Wert ist der deutsche String (z.B. `__('Anmelden')`).
2. `lang/de.json` und `lang/en.json` mit den Keys befüllen.
3. Locale-Switcher im Layout einbauen (`route('locale.set', 'en')`), Session-Locale respektieren.
4. Volt-Komponenten mit deutschen Default-Strings sind kompatibel — `__()` ohne Übersetzung gibt den Key zurück.
5. Enum-Labels (`LeadStatus::label()`) als `match` mit `__()`-Werten umstellen.
6. Datumsformatierung über `Carbon::setLocale()` (in `AppServiceProvider`).
7. Zahlen-Format: `Number::currency(...)` statt hardcoded `,`-Decimals.

**Wer das macht** sollte zuerst eine Inventur machen (`grep -rE "label=\"|placeholder=\"" resources/views/livewire/`), Top-50 Strings extrahieren und konsistent in beide JSON-Files schreiben.

## Backend-Konvention

- **Domain-Layer-Pflicht**: Geschäftslogik gehört in `app/Domain/<BoundedContext>/`. Keine Service-Klassen direkt in `app/Http/Controllers/`. Volt-Komponenten dürfen Services per DI ziehen, aber keine eigene Logik enthalten.
- **Cost-Logging-Pflicht**: Jeder externe API-Call (Google, Anthropic, OpenAI) muss vor dem Senden `CostGuard::assertWithinDailyCap()` aufrufen UND nach Erfolg `CostTracker::record()` schreiben.
- **HMAC-Pflicht**: Eingehende Webhooks müssen das `VerifiesGeneratorSignature`-Trait nutzen. Niemals `if (!$secret) return true` — leerer Secret = `return false` (siehe `app/Http/Controllers/Webhooks/VerifiesGeneratorSignature.php`).
- **LLM-Calls**: Über `App\Domain\Llm\LlmService` (oder den BC-Shim `ClaudeClient`). Modell-IDs **nie** hardcoden — immer `config('services.<provider>.model_default'|'model_cheap')`.
- **Storage**: Lead-Files über `LeadStorageService` (nutzt `leads`-Disk). Kein `file_put_contents` oder `Storage::disk('local')` für Lead-Daten.
- **Async**: Pipeline-Schritte als Jobs auf passender Queue (`scrape`, `enrichment`, `discovery`, `generation`). Synchroner Aufruf nur in Tests.

## Test-Pflicht

Neue Domain-Services brauchen mindestens einen Unit-Test. Neue Webhook-Routen brauchen HMAC-Tests. Neue Cost-relevante Calls brauchen einen CostGuard-Test (Mock + Cap-Verletzung).

## Sicherheits-Checkliste vor Merge

- [ ] Volt-Routen hinter `auth`-Middleware (außer Webhooks + `login`)
- [ ] Externe Webhooks via HMAC + Replay-Window
- [ ] FormRequest-Validierung oder `$request->validate(...)` für jede neue Eingabe
- [ ] Keine Secrets in Code, Config-Files committen ohne `env(...)`
- [ ] `composer dev` läuft sauber, `php artisan test` grün
- [ ] Pflicht-Reviews aus globaler `~/.claude/CLAUDE.md` (code-review + security-guidance) durchgelaufen

## Predesigned-Layouts (Roadmap, noch nicht implementiert)

Geplante Erweiterung — siehe Plan in `~/.claude/plans/alalysiere-diese-gesamte-app-lazy-thunder.md` Phase 4. Branchen-Templates für: Restaurant, Friseur, Handwerk, Arzt, **Verein** (Musik/Sport, regionaler Fokus).

## Deploy-Flow

1. `composer install --no-dev`, `npm ci && npm run build`
2. `php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan view:cache`
3. `supervisorctl restart webvulture-queue:* webvulture-reverb webvulture-generator`

Generator separat builden: `cd generator && npm ci && npm run build`.

## Bekannte Eigenheiten

- `database/migrations/2026_*` — Datums-Prefix ist *zukünftig*, das ist Absicht (sortierte Reihenfolge).
- `users` Tabelle existiert, aber kein UI-Register — User per `tinker` anlegen.
- Generator schreibt nach `/tmp/wv-projects/` und `/tmp/wv-artifacts/` — bei Server-Reboot weg. Final-Artifacts müssen ins persistente `/var/www/webseiten-werkstatt/{lead}/` kopiert werden (Build-Job-TODO).
