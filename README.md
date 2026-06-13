# WebVulture

B2B Lead-Generation und Website-Prototyping-Tool für lokale Unternehmen. Pipeline:

```
Discovery → Scraping → Enrichment → Generation → Build → Approve
 (Maps)    (HTTP+Crawl)  (Claude)    (Astro)   (statisch)  (Mensch)
```

## Stack

- **PHP 8.3 / Laravel 13**, Livewire 4 + Volt
- **MaryUI** (DaisyUI / Tailwind 4)
- **Reverb** für WebSockets (Live-Updates statt Polling)
- **Spatie Browsershot** (Puppeteer) für Screenshots
- **Node.js + TypeScript** Generator-Microservice (Fastify, Port 4000)
- **MySQL 8** (Prod) / **SQLite** (Tests)
- **Redis** für Cache, Session, Cost-Limit-Counter
- LLM-Abstraktion: Anthropic Claude (default) oder OpenAI über `LlmProvider`-Interface

## Setup lokal

```bash
composer install
npm ci
cp .env.example .env
php artisan key:generate
php artisan migrate
npm run build           # oder `npm run dev` während Entwicklung

# Generator separat starten
cd generator && npm ci && npm run dev

# Alles parallel via composer dev
composer dev
```

Pflicht in `.env`:

| Variable | Zweck |
|---|---|
| `APP_KEY` | via `key:generate` |
| `GOOGLE_MAPS_API_KEY` | Places-API |
| `ANTHROPIC_API_KEY` | Claude für Enrichment + Generation |
| `OPENAI_API_KEY` | optional, schaltet zweiten LLM-Provider scharf |
| `LLM_PROVIDER_DEFAULT` | `anthropic` (default) oder `openai` |
| `GENERATOR_URL` | `http://localhost:4000` |
| `GENERATOR_SECRET` | gemeinsames Secret für HMAC |
| `CHROME_PATH` | absoluter Pfad zu Chrome/Chromium |
| `LEADS_DISK` | `local` (default) oder `s3` |
| `COST_CAP_DAILY_USD` | Tageskostengrenze (default 20) |
| `COST_CAP_PER_LEAD_USD` | Pro-Lead-Kostengrenze (default 2) |

User anlegen:

```bash
php artisan tinker
> User::create(['name' => 'Admin', 'email' => 'you@example.com', 'password' => bcrypt('secret')])
```

## Tests

```bash
php artisan test
./vendor/bin/pint           # Code-Style
```

Aktuelle Coverage-Schwerpunkte:

- Webhook-HMAC inkl. Replay-Schutz
- Login/Auth (Routes hinter `auth`-Middleware)
- Rate-Limiting auf `/search`
- CostGuard (täglich + per Lead)
- Storage-Cleanup-Job (Lock gegen Race)
- Generator Circuit-Breaker
- LLM-Provider-Factory

## Deployment (Production)

Stack auf dem Server:

- Ubuntu 22.04/24.04 LTS, PHP 8.3-FPM, Nginx, MySQL 8, Redis, Supervisor
- 4× Queue-Worker via Supervisor (`high,default,scrape,enrichment,discovery,generation`)
- Reverb auf 127.0.0.1:8080, Nginx-Proxy `/app`
- Generator als Supervisor-Service auf 127.0.0.1:4000
- Wildcard-TLS für `*.webseiten-werkstatt.at` (Demo-Hosting)

## Architektur

- `app/Domain/Discovery/` — Google Places API
- `app/Domain/Scraping/` — HTTP-Fetch, Crawl, HTML-Extract, Screenshots
- `app/Domain/Enrichment/` — LLM-getriebene Business-Analyse
- `app/Domain/Llm/` — Provider-Abstraktion (Anthropic + OpenAI)
- `app/Domain/Prototype/` — Generator-Client + Health-Probe (Circuit-Breaker)
- `app/Domain/Storage/` — Filesystem-Abstraktion (`leads`-Disk)
- `app/Domain/Cost/` + `app/Support/CostGuard.php` — Cost-Tracking + Caps
- `app/Jobs/` — Async-Pipeline (Discover → Scrape → Screenshots → Enrich → Generate → Build → Cleanup)
- `app/Events/` — `LeadStatusChanged`, `JobProgressUpdated` (Reverb)
- `routes/web.php` — Auth-geschützte Volt-Routen + HMAC-Webhooks
- `generator/` — Node-Service mit Fastify + Anthropic SDK
- `generator/src/templates/` — **20 Branchen-Templates** (`LayoutKind` in `generator/src/types.ts`): standard, restaurant, friseur, handwerk, bauunternehmen, arzt, verein, verein_musik, verein_sport, verein_tradition, golfclub, kanzlei, hotel, fitness, einzelhandel, galerie, autohaus, energie, bestattung, tier

## Sicherheit

- Webhook-HMAC mit Replay-Schutz (5 min Toleranz, configurable)
- Volt-Routen hinter `auth`-Middleware
- Rate-Limit auf `/search` (3/min) und `/login` (5/min)
- Cost-Caps blockieren externe LLM-/Maps-Calls bei Überschreitung
- CSP-Header für Demo-Sites empfohlen (Nginx)
- SSH künftig per Public-Key-Auth, nicht Passwort

## Troubleshooting

| Problem | Lösung |
|---|---|
| `Vite manifest not found` in Tests | TestCase nutzt `withoutVite()` — sicherstellen, dass alle Tests von `Tests\TestCase` erben |
| Browsershot `node not found` | `CHROME_PATH` setzen + `node` im PATH oder via Browsershot-Konfig |
| Reverb verbindet nicht | `REVERB_HOST`/`PORT`/`SCHEME` in `.env` UND `VITE_REVERB_*` müssen matchen |
| `GENERATOR_SECRET is not configured` | `.env` ergänzen, dann `php artisan config:cache` |
| Circuit-Breaker bleibt offen | `php artisan cache:forget wv:generator:circuit_open_until` |
