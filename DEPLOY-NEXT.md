# Deploy — Schritte für `claude/jovial-brahmagupta-678554`

Branch ist gepusht: https://github.com/webhoch-com/webvulture/pull/new/claude/jovial-brahmagupta-678554

Da Production-Deployment mit echten Credentials/SSH/Live-DB-Migrations vom Sandbox geblockt ist, müssen die Schritte unten **du selbst** ausführen.

## 1. PR erstellen + mergen

```bash
gh pr create --base main --head claude/jovial-brahmagupta-678554 \
  --title "feat: brand-extraction + cost-aggregator + dashboard breakdown + status-badge fix" \
  --body "Konsolidierter Patch: AssetDownloader, CostAggregator, Brand-Card im Lead-Detail, Dashboard mit Cost-Breakdown + Top-10-Leads, Status-Badge-Theme-Fix (rosa-auf-rosa behoben). 131/131 Tests grün."
```

Oder direkt mergen ohne PR (wenn du Repo-Owner bist):
```bash
git checkout main
git merge --ff-only claude/jovial-brahmagupta-678554
git push origin main
```

## 2. Auf den Production-Server deployen

```bash
# SSH zum Server
ssh root@<dein-production-server>

# Im Repo
cd /var/www/webvulture          # oder wo auch immer dein App-Dir liegt
git pull origin main             # holt den Patch

# DB-Migration laufen lassen (NEU: 2026_05_09_220000_extend_brand_extraction)
php artisan migrate --force

# Composer falls neue PHP-Deps
composer install --no-dev --optimize-autoloader

# Vite-Build (CSS mit Status-Badge-Fix + Dashboard-Breakdown CSS)
npm ci
npm run build

# Caches neu warmen
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Generator: TypeScript builden + restart
cd generator
npm ci
npm run build
# Dann Generator-Service neu starten (systemd / pm2 / docker — je nach Setup):
sudo systemctl restart wv-generator   # Beispiel
# oder
pm2 restart wv-generator
```

## 3. Browser-Cache leeren + Smoke-Test

1. **Hard-Refresh** im Browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Auf `/` → Dashboard sollte Cost-Breakdown + Top-Leads zeigen
3. Auf `/leads/{ID}` → Brand & Assets Card im Scrape-Daten-Tab sichtbar
4. Status-Badges in der Leads-Liste lesbar (weißer Text auf Pink, nicht rosa-auf-rosa)
5. Auf `/templates` → Vorlagen-Galerie unverändert

## 4. Vorschau-Webseiten der Musikvereine generieren

Für die 3 Vereine in deiner DB (Bruckmühl-Thomasroith, ungenach, Gampern):

```bash
# Auf dem Server
cd /var/www/webvulture

# Pro Lead die Pipeline triggern
php artisan tinker
> $lead = App\Models\Lead::find(1);  // ID anpassen
> App\Jobs\ScrapeSiteJob::dispatch($lead->id);
# warten bis status=scraped
> App\Jobs\EnrichLeadJob::dispatch($lead->id);
# warten bis enrichments-Eintrag existiert
> App\Jobs\RequestPrototypeGenerationJob::dispatch($lead->id);
# Die echte Vorschau wird unter https://<slug>.webseiten-werkstatt.at/ erreichbar
```

Oder als Bulk-Script:
```bash
php artisan tinker --execute='
foreach (App\Models\Lead::whereIn("category", ["Musikverein","Musikkapelle"])->get() as $lead) {
    App\Jobs\ScrapeSiteJob::dispatch($lead->id)->onQueue("scrape");
    App\Jobs\EnrichLeadJob::dispatch($lead->id)->onQueue("enrichment")->delay(now()->addSeconds(30));
    App\Jobs\RequestPrototypeGenerationJob::dispatch($lead->id)->onQueue("generation")->delay(now()->addMinute());
    echo "Queued: {$lead->name}\n";
}'
```

## 5. Rollback (falls was bricht)

```bash
git checkout main
git revert HEAD                   # erstellt Revert-Commit
git push origin main
# Auf Server: git pull + dieselben caches/builds wie oben
```

Die DB-Migration kannst du zurückrollen mit:
```bash
php artisan migrate:rollback --step=1
```

## Was im Worktree-Setup zurückbleibt

- `.env`-File enthält jetzt eine SQLite-Override (DB_CONNECTION=sqlite). Das war für lokale Demo. **Vor Production-Deploy zurückstellen** auf MySQL:
  ```bash
  cd /Users/webhoch/Desktop/Projekte/WebVulture/.claude/worktrees/jovial-brahmagupta-678554
  cp .env.bak .env   # Falls Backup-Datei vorhanden
  # Sonst: DB_CONNECTION=mysql wieder setzen + DB_DATABASE=webvulture
  ```
- Lokales SQLite (`database/database.sqlite`) hat 3 Demo-Musikvereine + 1 Demo-User. Zum Aufräumen einfach Datei löschen.
- `public/demo-verein-real/` enthält die lokal generierte Astro-Vorschau.
