<?php

use App\Models\User;
use App\Support\Enums\UserRole;
use Illuminate\Support\Facades\Hash;
use Livewire\Volt\Component;
use Mary\Traits\Toast;

new class extends Component {
    use Toast;

    public string $newName = '';
    public string $newEmail = '';
    public string $newPassword = '';
    public string $newRole = 'member';

    public function createUser(): void
    {
        $validated = $this->validate([
            'newName' => 'required|string|min:2|max:120',
            'newEmail' => 'required|email|unique:users,email',
            'newPassword' => 'required|string|min:8',
            'newRole' => 'required|in:admin,member',
        ]);

        User::create([
            'name' => $validated['newName'],
            'email' => strtolower($validated['newEmail']),
            'password' => Hash::make($validated['newPassword']),
            'role' => $validated['newRole'],
            'is_active' => true,
        ]);

        $this->reset('newName', 'newEmail', 'newPassword', 'newRole');
        $this->success('Angelegt', 'Benutzer wurde erstellt.');
    }

    public function toggleActive(int $userId): void
    {
        $u = User::find($userId);
        if (! $u) {
            return;
        }
        if ($u->id === auth()->id()) {
            $this->error('Nicht möglich', 'Sie können sich nicht selbst deaktivieren.');

            return;
        }
        $u->update(['is_active' => ! $u->is_active]);
        $this->success('Aktualisiert', $u->is_active ? 'Aktiv.' : 'Deaktiviert.');
    }

    public function changeRole(int $userId, string $role): void
    {
        if (! in_array($role, ['admin', 'member'], true)) {
            return;
        }
        $u = User::find($userId);
        if (! $u) {
            return;
        }
        $u->update(['role' => $role]);
        $this->success('Aktualisiert', "Rolle: {$role}");
    }

    public function with(): array
    {
        return [
            'users' => User::orderBy('id')->get(),
        ];
    }
}; ?>

<div class="users-page">
    <header class="users-hero">
        <span class="users-eyebrow"><span class="dot"></span> Team-Verwaltung</span>
        <h1 class="users-title">Benutzer<em>.</em></h1>
        <p class="users-lead">Legen Sie weitere Benutzer an. Administratoren haben Zugriff auf Einstellungen und User-Verwaltung, Mitarbeiter können nur Leads bearbeiten und Outreach versenden.</p>
    </header>

    <form wire:submit="createUser" class="users-card users-form">
        <h2>Neuen Benutzer anlegen</h2>
        <div class="users-grid">
            <div class="users-field">
                <label>Name</label>
                <input type="text" wire:model="newName" class="users-input" placeholder="Max Mustermann" required />
                @error('newName') <span class="users-error">{{ $message }}</span> @enderror
            </div>
            <div class="users-field">
                <label>E-Mail</label>
                <input type="email" wire:model="newEmail" class="users-input" placeholder="max@webhoch.com" required />
                @error('newEmail') <span class="users-error">{{ $message }}</span> @enderror
            </div>
            <div class="users-field">
                <label>Passwort (≥ 8 Zeichen)</label>
                <input type="password" wire:model="newPassword" class="users-input" required />
                @error('newPassword') <span class="users-error">{{ $message }}</span> @enderror
            </div>
            <div class="users-field">
                <label>Rolle</label>
                <select wire:model="newRole" class="users-input">
                    <option value="member">Mitarbeiter</option>
                    <option value="admin">Administrator</option>
                </select>
            </div>
        </div>
        <button type="submit" class="users-btn users-btn-primary" wire:loading.attr="disabled">
            <span wire:loading.remove>Anlegen</span>
            <span wire:loading>Lege an …</span>
        </button>
    </form>

    <section class="users-card">
        <h2>Bestehende Benutzer</h2>
        <table class="users-table">
            <thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Status</th><th></th></tr></thead>
            <tbody>
                @foreach ($users as $u)
                    <tr @if (! $u->is_active) class="is-inactive" @endif>
                        <td>{{ $u->name }}</td>
                        <td><code>{{ $u->email }}</code></td>
                        <td>
                            <select wire:change="changeRole({{ $u->id }}, $event.target.value)" class="users-role">
                                <option value="member" @selected($u->role?->value === 'member')>Mitarbeiter</option>
                                <option value="admin" @selected($u->role?->value === 'admin')>Administrator</option>
                            </select>
                        </td>
                        <td>
                            @if ($u->is_active) <span class="users-pill users-pill-ok">aktiv</span>
                            @else <span class="users-pill users-pill-off">deaktiviert</span>
                            @endif
                        </td>
                        <td>
                            @if ($u->id !== auth()->id())
                                <button wire:click="toggleActive({{ $u->id }})" class="users-btn users-btn-ghost">
                                    {{ $u->is_active ? 'Deaktivieren' : 'Aktivieren' }}
                                </button>
                            @else
                                <span class="users-self">(Sie selbst)</span>
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </section>
</div>

<style>
    .users-page { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; padding-bottom: 2rem; }
    .users-hero { text-align: center; padding: 1.5rem 1rem 0; }
    .users-eyebrow { display: inline-flex; align-items: center; gap: .55rem; font-family: 'JetBrains Mono', monospace; font-size: .72rem; letter-spacing: .14em; text-transform: uppercase; color: #ec65ba; padding: .4rem .95rem; background: rgba(236,101,186,.08); border: 1px solid rgba(236,101,186,.22); border-radius: 999px; font-weight: 600; margin-bottom: 1.5rem; }
    .users-eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: #ec65ba; }
    .users-title { font-family: 'Fraunces', Georgia, serif; font-size: clamp(2.5rem, 5vw, 3.85rem); font-weight: 500; letter-spacing: -.03em; line-height: 1; margin: 0 0 1rem; color: #0a0a0a; }
    .users-title em { font-style: italic; background: linear-gradient(120deg, #ec65ba 0%, #c084fc 50%, #7c3aed 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .users-lead { color: rgba(10,10,10,.65); font-size: 1.05rem; max-width: 60ch; margin: 0 auto; }

    .users-card { background: linear-gradient(180deg, #fff, #fafafa); border: 1px solid rgba(0,0,0,.08); border-radius: 16px; padding: clamp(1.5rem, 3vw, 2rem); display: flex; flex-direction: column; gap: 1.25rem; }
    .users-card h2 { font-family: 'Fraunces', Georgia, serif; font-size: 1.4rem; font-weight: 500; margin: 0; }
    .users-grid { display: grid; gap: 1rem; grid-template-columns: 1fr 1fr; }
    @media (max-width: 720px) { .users-grid { grid-template-columns: 1fr; } }
    .users-field { display: flex; flex-direction: column; gap: .4rem; }
    .users-field label { font-family: 'JetBrains Mono', monospace; font-size: .72rem; letter-spacing: .12em; text-transform: uppercase; font-weight: 600; color: rgba(10,10,10,.6); }
    .users-input { width: 100%; padding: .75rem 1rem; background: rgba(0,0,0,.025); border: 1px solid rgba(0,0,0,.1); border-radius: 8px; font-size: .95rem; outline: none; transition: all .2s; }
    .users-input:focus { border-color: #ec65ba; background: rgba(236,101,186,.05); box-shadow: 0 0 0 4px rgba(236,101,186,.1); }
    .users-error { font-size: .82rem; color: #dc2626; }

    .users-table { width: 100%; border-collapse: collapse; font-size: .92rem; }
    .users-table th, .users-table td { padding: .65rem .75rem; text-align: left; border-bottom: 1px solid rgba(0,0,0,.06); }
    .users-table th { font-family: 'JetBrains Mono', monospace; font-size: .7rem; letter-spacing: .1em; text-transform: uppercase; color: rgba(10,10,10,.5); font-weight: 600; }
    .users-table tr.is-inactive { opacity: .5; }
    .users-table code { font-size: .85rem; background: rgba(0,0,0,.04); padding: .15rem .4rem; border-radius: 4px; }
    .users-role { padding: .35rem .5rem; border: 1px solid rgba(0,0,0,.1); border-radius: 6px; background: #fff; font-size: .85rem; }

    .users-pill { padding: .2rem .6rem; border-radius: 999px; font-size: .72rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
    .users-pill-ok { background: rgba(34,197,94,.15); color: #15803d; }
    .users-pill-off { background: rgba(0,0,0,.08); color: rgba(10,10,10,.5); }
    .users-self { font-size: .85rem; color: rgba(10,10,10,.5); font-style: italic; }

    .users-btn { padding: .65rem 1.25rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: .9rem; font-family: inherit; transition: all .15s; }
    .users-btn-primary { background: linear-gradient(135deg, #ec65ba, #7c3aed); color: #fff; align-self: flex-start; }
    .users-btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .users-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 22px -8px rgba(236,101,186,.5); }
    .users-btn-ghost { background: #fff; border: 1px solid rgba(0,0,0,.1); color: rgba(10,10,10,.7); padding: .35rem .85rem; font-size: .82rem; }
    .users-btn-ghost:hover { background: rgba(0,0,0,.04); border-color: rgba(0,0,0,.2); }
</style>
