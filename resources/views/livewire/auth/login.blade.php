<?php

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Livewire\Attributes\Layout;
use Livewire\Volt\Component;
use Mary\Traits\Toast;

new #[Layout('components.layouts.guest')] class extends Component {
    use Toast;

    public string $email = '';
    public string $password = '';
    public bool $remember = false;

    public function login(): void
    {
        $credentials = $this->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $email = strtolower($this->email);
        $ip = request()->ip();
        $emailKey = 'login-email|'.$email;
        $ipKey = 'login-ip|'.$ip;

        if (RateLimiter::tooManyAttempts($emailKey, 5) || RateLimiter::tooManyAttempts($ipKey, 10)) {
            $seconds = max(
                RateLimiter::availableIn($emailKey),
                RateLimiter::availableIn($ipKey),
            );
            throw ValidationException::withMessages([
                'email' => "Zu viele Anmeldeversuche. Bitte in {$seconds} Sekunden erneut versuchen.",
            ]);
        }

        if (! Auth::attempt($credentials, $this->remember)) {
            RateLimiter::hit($emailKey, 60);
            RateLimiter::hit($ipKey, 60);
            throw ValidationException::withMessages([
                'email' => __('Diese Anmeldedaten sind ungültig.'),
            ]);
        }

        RateLimiter::clear($emailKey);
        RateLimiter::clear($ipKey);

        request()->session()->regenerate();

        $this->redirect(route('dashboard'), navigate: false);
    }
}; ?>

<div class="auth-page">
    {{-- Animated mesh background --}}
    <div class="auth-bg" aria-hidden="true">
        <div class="mesh m1"></div>
        <div class="mesh m2"></div>
        <div class="mesh m3"></div>
        <div class="grid-overlay"></div>
    </div>

    <div class="auth-shell">
        {{-- LEFT: webhoch.com agency showcase --}}
        <aside class="auth-brand">
            <div class="auth-brand-top">
                <a href="https://webhoch.com" target="_blank" rel="noopener" class="auth-mark">
                    <span class="auth-mark-dot"></span>
                    <span class="auth-mark-text">Webagentur Hochmeir e.U.</span>
                </a>
                <span class="auth-mark-tag">Internes System</span>
            </div>

            <div class="auth-brand-hero">
                <span class="auth-eyebrow">
                    <span class="dot"></span>
                    Software · Web · E-Commerce · Hosting
                </span>
                <h1 class="auth-headline">
                    Wir bauen Ihre <em>digitale Zukunft</em>.
                </h1>
                <p class="auth-lead">
                    Custom Software, Web-Apps, Webseiten und Online-Shops —
                    maßgeschneidert, modern, performant. Self-hosted in Österreich,
                    100% DSGVO-konform.
                </p>

                <ul class="auth-services">
                    <li><span class="ic">◆</span>Custom Web-Apps &amp; SaaS</li>
                    <li><span class="ic">◆</span>Webseiten &amp; Landing Pages</li>
                    <li><span class="ic">◆</span>Online-Shops &amp; Payment</li>
                    <li><span class="ic">◆</span>Wartung, Hosting, Monitoring</li>
                </ul>
            </div>

            <div class="auth-brand-stats">
                <div class="auth-stat">
                    <strong>50+</strong>
                    <span>Projekte realisiert</span>
                </div>
                <div class="auth-stat">
                    <strong>5+ Jahre</strong>
                    <span>Erfahrung</span>
                </div>
                <div class="auth-stat">
                    <strong>100%</strong>
                    <span>DSGVO · Self-hosted</span>
                </div>
            </div>

            <footer class="auth-brand-foot">
                <a href="https://webhoch.com" target="_blank" rel="noopener" class="auth-foot-link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                    webhoch.com
                </a>
                <span>·</span>
                <span>Rutzenmoos · Österreich</span>
            </footer>
        </aside>

        {{-- RIGHT: login card --}}
        <main class="auth-form-wrap">
            <div class="auth-card" wire:transition>
                <div class="auth-card-glow"></div>

                <header class="auth-card-head">
                    <span class="auth-card-eyebrow">Anmeldung</span>
                    <h2>Willkommen zurück.</h2>
                    <p>Melden Sie sich mit Ihren Zugangsdaten an.</p>
                </header>

                <form wire:submit="login" class="auth-form">
                    <div class="auth-field">
                        <label for="auth-email">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            E-Mail-Adresse
                        </label>
                        <input
                            id="auth-email"
                            type="email"
                            wire:model="email"
                            placeholder="ihre@adresse.at"
                            autocomplete="email"
                            autofocus
                            required
                            class="auth-input"
                        />
                        @error('email') <span class="auth-error">{{ $message }}</span> @enderror
                    </div>

                    <div class="auth-field">
                        <label for="auth-password">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            Passwort
                        </label>
                        <input
                            id="auth-password"
                            type="password"
                            wire:model="password"
                            placeholder="••••••••"
                            autocomplete="current-password"
                            required
                            class="auth-input"
                        />
                        @error('password') <span class="auth-error">{{ $message }}</span> @enderror
                    </div>

                    <label class="auth-remember">
                        <input type="checkbox" wire:model="remember" />
                        <span class="auth-check"></span>
                        <span>Angemeldet bleiben</span>
                    </label>

                    <button type="submit" class="auth-submit" wire:loading.attr="disabled" wire:target="login">
                        <span wire:loading.remove wire:target="login">Anmelden</span>
                        <span wire:loading.flex wire:target="login" class="auth-spinner" style="display: none;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                            Wird geprüft …
                        </span>
                    </button>
                </form>

                <footer class="auth-card-foot">
                    <p>
                        Zugang nur für Mitarbeitende der
                        <strong>Webagentur Hochmeir e.U.</strong>
                    </p>
                    <p>
                        Probleme? <a href="mailto:hello@webhoch.com">hello@webhoch.com</a>
                    </p>
                </footer>
            </div>
        </main>
    </div>
</div>

<style>
    body {
        background: #fafafa;
        font-family: 'Inter', system-ui, sans-serif;
        color: #0a0a0a;
    }

    .auth-page {
        position: relative;
        min-height: 100vh;
        overflow: hidden;
        isolation: isolate;
    }

    /* ─── Animated mesh background ───────────────────────────── */
    .auth-bg {
        position: fixed;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        pointer-events: none;
    }
    .mesh {
        position: absolute;
        border-radius: 50%;
        filter: blur(120px);
        opacity: 0.22;
        will-change: transform;
        animation: mesh-float 22s ease-in-out infinite;
    }
    .mesh.m1 {
        width: 720px; height: 720px;
        top: -240px; left: -160px;
        background: radial-gradient(circle, #ec65ba 0%, transparent 65%);
    }
    .mesh.m2 {
        width: 820px; height: 820px;
        bottom: -300px; right: -260px;
        background: radial-gradient(circle, #7c3aed 0%, transparent 65%);
        animation-delay: -8s;
    }
    .mesh.m3 {
        width: 580px; height: 580px;
        top: 30%; left: 40%;
        background: radial-gradient(circle, #06b6d4 0%, transparent 65%);
        opacity: 0.35;
        animation-delay: -14s;
    }
    @keyframes mesh-float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33%      { transform: translate(80px, -40px) scale(1.08); }
        66%      { transform: translate(-50px, 50px) scale(0.94); }
    }
    .grid-overlay {
        position: absolute; inset: 0;
        background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
        background-size: 56px 56px;
        mask-image: radial-gradient(circle at 50% 50%, black 30%, transparent 80%);
        -webkit-mask-image: radial-gradient(circle at 50% 50%, black 30%, transparent 80%);
    }

    @media (prefers-reduced-motion: reduce) {
        .mesh { animation: none !important; }
    }

    /* ─── Layout shell ───────────────────────────────────────── */
    .auth-shell {
        position: relative;
        z-index: 1;
        display: grid;
        min-height: 100vh;
        grid-template-columns: 1fr;
        gap: 0;
    }
    @media (min-width: 980px) {
        .auth-shell { grid-template-columns: 1.05fr 1fr; }
    }

    /* ─── LEFT: brand panel ──────────────────────────────────── */
    .auth-brand {
        display: flex; flex-direction: column;
        justify-content: space-between;
        padding: clamp(2rem, 4vw, 4rem);
        color: #0a0a0a;
        gap: 2rem;
    }

    .auth-brand-top {
        display: flex; align-items: center; justify-content: space-between;
        gap: 1rem; flex-wrap: wrap;
    }
    .auth-mark {
        display: inline-flex; align-items: center; gap: 0.7rem;
        font-weight: 700; font-size: 1.05rem;
        letter-spacing: -0.01em;
        color: #0a0a0a; text-decoration: none;
        transition: opacity .2s;
    }
    .auth-mark:hover { opacity: 0.85; }
    .auth-mark-dot {
        width: 12px; height: 12px;
        background: linear-gradient(135deg, #ec65ba, #7c3aed);
        border-radius: 3px; transform: rotate(45deg);
        box-shadow: 0 0 18px rgba(236,101,186,0.6);
    }
    .auth-mark-tag {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase;
        color: rgba(10,10,10,0.6);
        padding: 0.35rem 0.75rem;
        border: 1px solid rgba(10,10,10,0.15);
        border-radius: 999px;
        background: rgba(10,10,10,0.04);
    }

    .auth-brand-hero {
        animation: fade-up .9s cubic-bezier(0.16,1,0.3,1) both 0.1s;
    }
    .auth-eyebrow {
        display: inline-flex; align-items: center; gap: 0.55rem;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.74rem; letter-spacing: 0.1em; text-transform: uppercase;
        color: #ec65ba;
        padding: 0.4rem 0.95rem;
        background: rgba(236,101,186,0.08);
        border: 1px solid rgba(236,101,186,0.25);
        border-radius: 999px;
        margin-bottom: 1.85rem;
        font-weight: 600;
    }
    .auth-eyebrow .dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #ec65ba;
        animation: pulse 2.4s ease-in-out infinite;
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.4; transform: scale(0.7); }
    }
    .auth-headline {
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(2.5rem, 5.5vw, 4.6rem);
        font-weight: 500;
        line-height: 1.02;
        letter-spacing: -0.03em;
        color: #0a0a0a;
        margin: 0;
        max-width: 12ch;
    }
    .auth-headline em {
        font-style: italic;
        background: linear-gradient(120deg, #ec65ba 0%, #c084fc 50%, #7c3aed 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        font-weight: 500;
    }
    .auth-lead {
        color: rgba(10,10,10,0.72);
        font-size: 1.1rem;
        line-height: 1.7;
        margin: 1.85rem 0 0;
        max-width: 480px;
    }
    .auth-services {
        list-style: none;
        padding: 0;
        margin: 1.85rem 0 0;
        display: grid;
        gap: 0.7rem;
        max-width: 480px;
    }
    .auth-services li {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        font-size: 0.96rem;
        color: rgba(10,10,10,0.85);
        font-weight: 500;
    }
    .auth-services .ic {
        width: 22px;
        height: 22px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, rgba(236,101,186,0.2), rgba(124,58,237,0.2));
        color: #ec65ba;
        border: 1px solid rgba(236,101,186,0.35);
        border-radius: 6px;
        font-size: 0.7rem;
        flex-shrink: 0;
    }
    @media (min-width: 600px) { .auth-services { grid-template-columns: 1fr 1fr; } }

    .auth-brand-stats {
        display: grid; gap: 1rem;
        grid-template-columns: repeat(3, 1fr);
        padding: 1.85rem 0 0;
        border-top: 1px solid rgba(10,10,10,0.08);
        animation: fade-up .9s cubic-bezier(0.16,1,0.3,1) both 0.3s;
    }
    .auth-stat strong {
        display: block;
        font-family: 'Fraunces', Georgia, serif;
        font-size: clamp(1.85rem, 3vw, 2.4rem);
        font-weight: 500;
        line-height: 1;
        background: linear-gradient(120deg, #1f1147, #7c3aed);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        letter-spacing: -0.02em;
    }
    .auth-stat span {
        display: block;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.74rem; letter-spacing: 0.1em; text-transform: uppercase;
        color: rgba(10,10,10,0.55);
        margin-top: 0.55rem;
        font-weight: 500;
    }

    .auth-brand-foot {
        display: flex; align-items: center; gap: 0.65rem;
        flex-wrap: wrap;
        font-size: 0.84rem;
        color: rgba(10,10,10,0.5);
    }
    .auth-foot-link {
        display: inline-flex; align-items: center; gap: 0.4rem;
        color: rgba(10,10,10,0.7);
        text-decoration: none;
        font-weight: 600;
        transition: color .2s;
    }
    .auth-foot-link:hover { color: #ec65ba; }

    /* ─── RIGHT: glass card ──────────────────────────────────── */
    .auth-form-wrap {
        display: flex; align-items: center; justify-content: center;
        padding: clamp(1.5rem, 4vw, 4rem);
    }
    .auth-card {
        position: relative;
        width: 100%;
        max-width: 460px;
        padding: clamp(2rem, 4vw, 3rem);
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(28px) saturate(140%);
        -webkit-backdrop-filter: blur(28px) saturate(140%);
        border: 1px solid rgba(0,0,0,0.08);
        border-radius: 24px;
        box-shadow:
            0 30px 80px -20px rgba(0,0,0,0.5),
            inset 0 1px 0 rgba(255,255,255,0.06);
        animation: fade-up .9s cubic-bezier(0.16,1,0.3,1) both 0.2s;
    }
    .auth-card-glow {
        position: absolute; inset: -1px;
        border-radius: 24px;
        padding: 1px;
        background: linear-gradient(135deg, rgba(236,101,186,0.4), transparent 40%, transparent 60%, rgba(124,58,237,0.4));
        -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
                mask-composite: exclude;
        pointer-events: none;
    }

    .auth-card-head { margin-bottom: 2rem; }
    .auth-card-eyebrow {
        display: inline-block;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase;
        color: #ec65ba;
        font-weight: 600;
        margin-bottom: 0.75rem;
    }
    .auth-card-head h2 {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 2rem;
        font-weight: 500;
        letter-spacing: -0.02em;
        line-height: 1.1;
        margin: 0 0 0.5rem;
        color: #0a0a0a;
    }
    .auth-card-head p {
        color: rgba(10,10,10,0.6);
        font-size: 0.96rem;
        margin: 0;
    }

    /* ─── Form fields ────────────────────────────────────────── */
    .auth-form { display: flex; flex-direction: column; gap: 1.25rem; }

    .auth-field { display: flex; flex-direction: column; gap: 0.5rem; }
    .auth-field label {
        display: inline-flex; align-items: center; gap: 0.5rem;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase;
        font-weight: 600;
        color: rgba(10,10,10,0.65);
    }
    .auth-input {
        width: 100%;
        padding: 0.95rem 1.1rem;
        background: rgba(0,0,0,0.02);
        border: 1px solid rgba(0,0,0,0.1);
        border-radius: 12px;
        color: #0a0a0a;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 1rem;
        line-height: 1.4;
        transition: all .2s ease;
        outline: none;
    }
    .auth-input::placeholder { color: rgba(10,10,10,0.3); }
    .auth-input:hover { border-color: rgba(0,0,0,0.18); background: rgba(0,0,0,0.04); }
    .auth-input:focus {
        border-color: #ec65ba;
        background: rgba(236,101,186,0.05);
        box-shadow: 0 0 0 4px rgba(236,101,186,0.1);
    }
    .auth-error {
        font-size: 0.84rem;
        color: #f87171;
        font-family: 'Inter', system-ui, sans-serif;
        margin-top: 0.25rem;
    }

    /* ─── Custom checkbox ────────────────────────────────────── */
    .auth-remember {
        display: inline-flex; align-items: center; gap: 0.65rem;
        cursor: pointer;
        user-select: none;
        color: rgba(10,10,10,0.75);
        font-size: 0.95rem;
        margin-top: 0.25rem;
    }
    .auth-remember input { position: absolute; opacity: 0; pointer-events: none; }
    .auth-check {
        flex-shrink: 0;
        width: 20px; height: 20px;
        border-radius: 6px;
        /* Was rgba(255,255,255,0.2) — invisible on the white card. */
        border: 1.5px solid rgba(10,10,10,0.18);
        background: rgba(0,0,0,0.025);
        position: relative;
        transition: all .2s;
    }
    .auth-remember:hover .auth-check { border-color: rgba(236,101,186,0.5); }
    .auth-remember input:focus-visible + .auth-check {
        outline: 2px solid #ec65ba;
        outline-offset: 3px;
    }
    .auth-remember input:checked + .auth-check {
        background: linear-gradient(135deg, #ec65ba, #7c3aed);
        border-color: transparent;
    }
    .auth-remember input:checked + .auth-check::after {
        content: "";
        position: absolute;
        top: 3px; left: 6px;
        width: 5px; height: 10px;
        border: solid #fff;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
    }

    /* ─── Submit button ──────────────────────────────────────── */
    .auth-submit {
        margin-top: 0.85rem;
        padding: 1rem 1.5rem;
        background: linear-gradient(135deg, #ec65ba 0%, #7c3aed 100%);
        color: #fff;
        border: none;
        border-radius: 12px;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 1rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        cursor: pointer;
        transition: all .25s cubic-bezier(0.16,1,0.3,1);
        box-shadow: 0 8px 24px -8px rgba(236,101,186,0.5);
        position: relative;
        overflow: hidden;
        display: flex; align-items: center; justify-content: center;
        gap: 0.55rem;
        min-height: 48px;
    }
    .auth-submit::before {
        content: "";
        position: absolute; inset: 0;
        background: linear-gradient(135deg, #ff7ac9, #9d6cfb);
        opacity: 0;
        transition: opacity .25s;
    }
    .auth-submit:hover::before { opacity: 1; }
    .auth-submit:hover {
        transform: translateY(-2px);
        box-shadow: 0 14px 32px -10px rgba(236,101,186,0.65);
    }
    .auth-submit:active { transform: translateY(0); }
    .auth-submit:disabled {
        cursor: not-allowed;
        opacity: 0.7;
        transform: none !important;
    }
    .auth-submit > * { position: relative; z-index: 1; }
    .auth-spinner {
        display: inline-flex; align-items: center; gap: 0.55rem;
    }
    .auth-spinner svg { animation: spin 0.9s linear infinite; }
    @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
    }

    /* ─── Card footer ────────────────────────────────────────── */
    .auth-card-foot {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid rgba(0,0,0,0.06);
        text-align: center;
    }
    .auth-card-foot p {
        font-size: 0.82rem;
        color: rgba(10,10,10,0.5);
        margin: 0 0 0.25rem;
        line-height: 1.6;
    }
    .auth-card-foot strong { color: rgba(10,10,10,0.75); font-weight: 600; }
    .auth-card-foot a {
        color: #ec65ba;
        text-decoration: none;
        font-weight: 600;
        transition: color .2s;
    }
    .auth-card-foot a:hover { color: #ff7ac9; text-decoration: underline; }

    /* ─── Animations ─────────────────────────────────────────── */
    @keyframes fade-up {
        from { opacity: 0; transform: translateY(28px); }
        to   { opacity: 1; transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
        .auth-card, .auth-brand-hero, .auth-brand-stats, .auth-eyebrow .dot, .auth-spinner svg { animation: none !important; }
    }

    /* ─── Mobile adjustments ─────────────────────────────────── */
    @media (max-width: 979px) {
        .auth-shell { gap: 0; }
        .auth-brand {
            padding: 1.5rem 1.5rem 0;
            min-height: auto;
        }
        .auth-brand-hero { margin: 1rem 0; }
        .auth-headline { font-size: clamp(2rem, 8vw, 2.5rem); }
        .auth-lead { font-size: 0.96rem; }
        .auth-brand-stats { grid-template-columns: repeat(3, 1fr); padding: 1.25rem 0; gap: 0.5rem; }
        .auth-stat strong { font-size: clamp(1.1rem, 4vw, 1.5rem); word-break: break-word; }
        .auth-stat span { font-size: 0.62rem; word-break: break-word; }
        .auth-brand-foot { font-size: 0.76rem; padding-bottom: 0; }
    }
    @media (max-width: 360px) {
        /* On the smallest phones, "5+ Jahre" + "Self-hosted" wraps awkwardly
           at 3 columns — stack to 1 col so each stat keeps full width. */
        .auth-brand-stats { grid-template-columns: 1fr 1fr; }
        .auth-brand-stats .auth-stat:nth-child(3) { grid-column: 1 / -1; }
    }
</style>
