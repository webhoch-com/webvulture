<?php

use App\Domain\Settings\ConnectionTester;
use App\Domain\Settings\SettingsRepository;
use App\Domain\Settings\SettingsSchema;
use Livewire\Volt\Component;

new class extends Component {
    /**
     * Aktuelles Tab. Mögliche Werte: api_keys, cost_caps, mail, imap.
     */
    public string $tab = 'api_keys';

    /**
     * Form-State pro Settings-Slot. Key = "{group}|{key}".
     * Wird beim mount() aus SettingsRepository->getForUi() initialisiert —
     * Secrets erscheinen als SECRET_PLACEHOLDER (•••••••), Klartext-Werte
     * stehen direkt drin.
     */
    public array $values = [];

    /**
     * Test-Connection-Resultate pro Service-Key. ['ok' => bool, 'message' => string].
     */
    public array $testResults = [];

    /**
     * Flash-Message nach Save.
     */
    public string $flash = '';

    public function mount(SettingsRepository $repo): void
    {
        foreach (SettingsSchema::all() as $slot) {
            $key = $slot['group'].'|'.$slot['key'];
            $this->values[$key] = $repo->getForUi($slot['group'], $slot['key']) ?? '';
        }

        $this->refreshStatusList($repo);
    }

    // Sections + Slots werden NICHT als public properties gehalten —
    // das brach Livewire's Hydrate-Layer ("getName() on array"). render()
    // override greift in Volt-Volt-Komponenten nicht durchsehbar.
    // Pragmatisch: das Blade ruft SettingsSchema direkt auf via @php-Block.

    public function save(SettingsRepository $repo): void
    {
        $payload = [];
        foreach (SettingsSchema::all() as $slot) {
            $formKey = $slot['group'].'|'.$slot['key'];
            $value = $this->values[$formKey] ?? '';
            // Leerer String und Secret-Placeholder = "nicht geändert".
            if ($value === '' || $value === SettingsSchema::SECRET_PLACEHOLDER) {
                continue;
            }
            $payload[$slot['group']][$slot['key']] = $value;
        }

        $count = $repo->bulkSet($payload, auth()->user());

        // Refresh form-state — Secrets gehen jetzt wieder zu Placeholder.
        foreach (SettingsSchema::all() as $slot) {
            $formKey = $slot['group'].'|'.$slot['key'];
            $this->values[$formKey] = $repo->getForUi($slot['group'], $slot['key']) ?? '';
        }

        $this->flash = $count > 0
            ? "{$count} Einstellung".($count === 1 ? '' : 'en').' aktualisiert.'
            : 'Nichts geändert.';

        $this->refreshStatusList($repo);
    }

    public function testService(string $service, ConnectionTester $tester): void
    {
        $this->testResults[$service] = $tester->test($service);
    }

    public function clearSecret(string $group, string $key, SettingsRepository $repo): void
    {
        $repo->set($group, $key, null, auth()->user());
        $this->values[$group.'|'.$key] = '';
        $this->flash = 'Wert gelöscht.';
        $this->refreshStatusList($repo);
    }

    public array $statusList = [];

    private function refreshStatusList(SettingsRepository $repo): void
    {
        $this->statusList = $repo->statusList()->toArray();
    }

    // Sections + grouped slots werden in mount() als public-array initialisiert
    // (siehe oben). Frühere Versuche mit `with()` und `#[Computed]` rendete
    // im Blade leer — Livewire Volt-AnonClass scheint die nicht zuverlässig
    // ans View durchzugeben. Public Array-Properties funktionieren immer.
}; ?>

<div class="settings-page">
    <header class="settings-hero">
        <span class="settings-eyebrow"><span class="dot"></span> Konfiguration · API-Keys & Limits</span>
        <h1 class="settings-title">Einstellungen<em>.</em></h1>
        <p class="settings-lead">
            API-Keys werden verschlüsselt in der Datenbank gespeichert und überschreiben die
            Werte aus der <code>.env</code>-Datei. Leere Felder fallen automatisch auf <code>.env</code> zurück.
        </p>
    </header>

    @php
        // Direkt aus dem Schema laden — Volt-render() override greift nicht
        // zuverlässig, und public-array-properties brechen den hydrate-Layer.
        // Schema-Aufruf ist deterministisch + günstig.
        $sections = \App\Domain\Settings\SettingsSchema::sections();
        $slots = collect(\App\Domain\Settings\SettingsSchema::all())->groupBy('section')->toArray();
    @endphp

    @if ($flash)
        <div class="settings-flash" wire:transition>{{ $flash }}</div>
    @endif

    <nav class="settings-tabs">
        @foreach ($sections as $sectionKey => $sectionLabel)
            <button type="button" wire:click="$set('tab', '{{ $sectionKey }}')"
                class="settings-tab @if ($tab === $sectionKey) is-active @endif">
                {{ $sectionLabel }}
            </button>
        @endforeach
    </nav>

    <form wire:submit="save" class="settings-card">
        <div class="settings-card-glow"></div>

        @foreach ($slots[$tab] ?? [] as $slot)
            @php
                $formKey = $slot['group'].'|'.$slot['key'];
                $service = explode('.', $slot['group'])[1] ?? null;
            @endphp
            <div class="settings-field">
                <label for="set-{{ $formKey }}">
                    {{ $slot['label'] }}
                    @if ($slot['is_secret'])
                        <span class="settings-badge">verschlüsselt</span>
                    @endif
                </label>
                <div class="settings-input-row">
                    <input
                        id="set-{{ $formKey }}"
                        type="{{ $slot['is_secret'] ? 'password' : 'text' }}"
                        wire:model.lazy="values.{{ $formKey }}"
                        autocomplete="off"
                        class="settings-input"
                        placeholder="@if ($slot['env']) z.B. aus {{ $slot['env'] }} @endif"
                    />
                    @if ($slot['is_secret'] && $values[$formKey] === \App\Domain\Settings\SettingsSchema::SECRET_PLACEHOLDER)
                        <button type="button"
                                wire:click="clearSecret('{{ $slot['group'] }}', '{{ $slot['key'] }}')"
                                class="settings-clear" title="Wert entfernen (Fallback auf .env)">×</button>
                    @endif
                </div>
                @if (! empty($slot['help']))
                    <small class="settings-help">{{ $slot['help'] }}</small>
                @endif
            </div>
        @endforeach

        @if ($tab === 'api_keys')
            <div class="settings-tests">
                <h3>Verbindungs-Tests</h3>
                <div class="settings-test-grid">
                    @foreach (['anthropic' => 'Anthropic', 'google_maps' => 'Google Places', 'openai' => 'OpenAI', 'generator' => 'Generator'] as $svc => $label)
                        <div class="settings-test-tile">
                            <button type="button" wire:click="testService('{{ $svc }}')"
                                wire:loading.attr="disabled" wire:target="testService('{{ $svc }}')"
                                class="settings-test-btn">
                                <span wire:loading.remove wire:target="testService('{{ $svc }}')">{{ $label }} prüfen</span>
                                <span wire:loading wire:target="testService('{{ $svc }}')">…</span>
                            </button>
                            @if (isset($testResults[$svc]))
                                <p class="settings-test-result @if ($testResults[$svc]['ok']) is-ok @else is-error @endif">
                                    @if ($testResults[$svc]['ok']) ✓ @else ✗ @endif
                                    {{ $testResults[$svc]['message'] }}
                                </p>
                            @endif
                        </div>
                    @endforeach
                </div>
            </div>
        @endif

        @if ($tab === 'mail')
            <div class="settings-tests">
                <button type="button" wire:click="testService('smtp')" class="settings-test-btn">
                    SMTP-Verbindung prüfen
                </button>
                @if (isset($testResults['smtp']))
                    <p class="settings-test-result @if ($testResults['smtp']['ok']) is-ok @else is-error @endif">
                        @if ($testResults['smtp']['ok']) ✓ @else ✗ @endif
                        {{ $testResults['smtp']['message'] }}
                    </p>
                @endif
            </div>
        @endif

        <div class="settings-actions">
            <button type="submit" class="settings-save" wire:loading.attr="disabled" wire:target="save">
                <span wire:loading.remove wire:target="save">Speichern</span>
                <span wire:loading wire:target="save">Speichere …</span>
            </button>
        </div>
    </form>

    <aside class="settings-status">
        <h3>Status aller Slots</h3>
        <table>
            <thead><tr><th>Slot</th><th>Quelle</th><th>Status</th></tr></thead>
            <tbody>
                @foreach ($statusList as $row)
                    <tr>
                        <td><code>{{ $row['group'] }}.{{ $row['key'] }}</code></td>
                        <td>
                            @if ($row['source'] === 'db') <span class="src-db">DB</span>
                            @elseif ($row['source'] === 'env') <span class="src-env">.env</span>
                            @else <span class="src-missing">leer</span>
                            @endif
                        </td>
                        <td>{{ $row['present'] ? '✓ gesetzt' : '— leer' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </aside>
</div>

<style>
    .settings-page { max-width: 1080px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; padding-bottom: 2rem; }
    .settings-hero { text-align: center; padding: 1.5rem 1rem 0; }
    .settings-eyebrow {
        display: inline-flex; align-items: center; gap: .55rem;
        font-family: 'JetBrains Mono', monospace; font-size: .72rem; letter-spacing: .14em;
        text-transform: uppercase; color: #ec65ba; padding: .4rem .95rem;
        background: rgba(236,101,186,.08); border: 1px solid rgba(236,101,186,.22);
        border-radius: 999px; font-weight: 600; margin-bottom: 1.5rem;
    }
    .settings-eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: #ec65ba; }
    .settings-title { font-family: 'Fraunces', Georgia, serif; font-size: clamp(2.5rem, 5vw, 3.85rem); font-weight: 500; letter-spacing: -.03em; line-height: 1; margin: 0 0 1rem; color: #0a0a0a; }
    .settings-title em { font-style: italic; background: linear-gradient(120deg, #ec65ba 0%, #c084fc 50%, #7c3aed 100%); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 500; }
    .settings-lead { color: rgba(10,10,10,.65); font-size: 1.05rem; max-width: 60ch; margin: 0 auto; }
    .settings-lead code { background: rgba(0,0,0,.06); padding: .12rem .35rem; border-radius: 4px; font-size: .85em; }

    .settings-flash { padding: .85rem 1.15rem; border-radius: 10px; background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.3); color: #15803d; font-weight: 500; }

    .settings-tabs { display: flex; gap: .5rem; flex-wrap: wrap; border-bottom: 1px solid rgba(0,0,0,.08); padding-bottom: 0; }
    .settings-tab { padding: .75rem 1.25rem; border: none; background: none; cursor: pointer; font-weight: 500; color: rgba(10,10,10,.55); border-bottom: 2px solid transparent; transition: all .15s; font-family: inherit; font-size: .95rem; }
    .settings-tab:hover { color: #0a0a0a; }
    .settings-tab.is-active { color: #ec65ba; border-bottom-color: #ec65ba; }

    .settings-card { position: relative; background: linear-gradient(180deg, #fff, #fafafa); border: 1px solid rgba(0,0,0,.08); border-radius: 20px; padding: clamp(1.75rem, 3vw, 2.5rem); overflow: hidden; display: flex; flex-direction: column; gap: 1.4rem; }
    .settings-card-glow { position: absolute; inset: -1px; border-radius: 20px; padding: 1px; background: linear-gradient(135deg, rgba(236,101,186,.3), transparent 50%, rgba(124,58,237,.3)); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }

    .settings-field { display: flex; flex-direction: column; gap: .5rem; }
    .settings-field label { display: flex; align-items: center; gap: .5rem; font-family: 'JetBrains Mono', monospace; font-size: .72rem; letter-spacing: .12em; text-transform: uppercase; font-weight: 600; color: rgba(10,10,10,.6); }
    .settings-badge { background: rgba(124,58,237,.1); color: #7c3aed; padding: .15rem .55rem; border-radius: 999px; font-size: .65rem; letter-spacing: .04em; }
    .settings-input-row { display: flex; gap: .5rem; align-items: stretch; }
    .settings-input { flex: 1; padding: .85rem 1.1rem; background: rgba(0,0,0,.025); border: 1px solid rgba(0,0,0,.1); border-radius: 10px; font-family: 'JetBrains Mono', monospace; font-size: .95rem; outline: none; transition: all .2s; }
    .settings-input:focus { border-color: #ec65ba; background: rgba(236,101,186,.05); box-shadow: 0 0 0 4px rgba(236,101,186,.1); }
    .settings-clear { padding: 0 1rem; background: rgba(0,0,0,.05); border: 1px solid rgba(0,0,0,.1); border-radius: 10px; cursor: pointer; font-size: 1.2rem; color: rgba(10,10,10,.5); transition: all .15s; }
    .settings-clear:hover { background: rgba(248,113,113,.1); border-color: rgba(248,113,113,.3); color: #dc2626; }
    .settings-help { color: rgba(10,10,10,.5); font-size: .82rem; }

    .settings-tests { padding: 1.25rem; background: rgba(6,182,212,.04); border: 1px solid rgba(6,182,212,.15); border-radius: 12px; margin-top: .5rem; }
    .settings-tests h3 { margin: 0 0 1rem; font-family: 'Fraunces', Georgia, serif; font-size: 1.05rem; font-weight: 500; }
    .settings-test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: .75rem; }
    .settings-test-tile { display: flex; flex-direction: column; gap: .5rem; }
    .settings-test-btn { padding: .65rem 1rem; background: #fff; border: 1px solid rgba(0,0,0,.1); border-radius: 8px; cursor: pointer; font-weight: 500; font-size: .9rem; transition: all .15s; font-family: inherit; }
    .settings-test-btn:hover { background: rgba(6,182,212,.08); border-color: rgba(6,182,212,.3); }
    .settings-test-btn:disabled { opacity: .5; }
    .settings-test-result { font-size: .82rem; line-height: 1.4; margin: 0; padding: .5rem .75rem; border-radius: 6px; }
    .settings-test-result.is-ok { background: rgba(34,197,94,.08); color: #15803d; }
    .settings-test-result.is-error { background: rgba(248,113,113,.08); color: #dc2626; }

    .settings-actions { margin-top: 1rem; padding-top: 1.5rem; border-top: 1px solid rgba(0,0,0,.06); display: flex; justify-content: flex-end; }
    .settings-save { padding: .85rem 1.75rem; background: linear-gradient(135deg, #ec65ba, #7c3aed); color: #fff; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all .2s; box-shadow: 0 8px 22px -8px rgba(236,101,186,.5); font-family: inherit; min-height: 44px; }
    .settings-save:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -8px rgba(236,101,186,.65); }
    .settings-save:disabled { opacity: .7; transform: none; cursor: not-allowed; }

    .settings-status { background: rgba(0,0,0,.02); border: 1px solid rgba(0,0,0,.08); border-radius: 16px; padding: 1.5rem; }
    .settings-status h3 { margin: 0 0 1rem; font-family: 'Fraunces', Georgia, serif; font-size: 1.05rem; font-weight: 500; }
    .settings-status table { width: 100%; border-collapse: collapse; font-size: .88rem; }
    .settings-status th, .settings-status td { padding: .5rem .75rem; text-align: left; border-bottom: 1px solid rgba(0,0,0,.06); }
    .settings-status th { font-family: 'JetBrains Mono', monospace; font-size: .7rem; letter-spacing: .1em; text-transform: uppercase; color: rgba(10,10,10,.5); font-weight: 600; }
    .settings-status code { font-size: .82rem; background: rgba(0,0,0,.04); padding: .15rem .4rem; border-radius: 4px; }
    .src-db { color: #15803d; font-weight: 600; }
    .src-env { color: #b45309; font-weight: 600; }
    .src-missing { color: #dc2626; font-weight: 600; }
</style>
