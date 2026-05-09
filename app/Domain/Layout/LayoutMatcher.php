<?php

namespace App\Domain\Layout;

use App\Support\Enums\LayoutKind;

class LayoutMatcher
{
    /**
     * Map of LayoutKind => array of regex patterns (case-insensitive) that match
     * Google-Maps `category`/`primary_type` strings or Claude-generated `niche` strings.
     *
     * Order matters: more specific patterns first; ambiguous categories should
     * resolve to the most likely kind.
     */
    private const PATTERNS = [
        // ─── Specific high-conviction matches (checked first) ────────────────
        'golfclub' => [
            'golfclub',
            'golf club',
            'golf-club',
            'golfresort',
            'golf resort',
            'golfanlage',
            'golfplatz',
            'golfpark',
            'gc ',
            ' golf',
            '18-loch',
            '18 loch',
            '9-loch',
        ],

        // ─── Verein subtypes (checked before generic 'verein' fallback) ──────
        'verein_musik' => [
            'musikverein',
            'musikkapelle',
            'blaskapelle',
            'blasmusik',
            'orchester',
            'chor',
            'gesangverein',
            'singverein',
            'philharmoni',
            'symphoni',
            'kapelle',
        ],
        'verein_sport' => [
            'sportverein',
            'turnverein',
            'fußballverein',
            'fussballverein',
            'fußballclub',
            'fussballclub',
            'fc ',
            'sk ',
            'sv ',
            'tsv',
            'tus ',
            'asv ',
            'ask ',
            'svw',
            'tennisclub',
            'tennisverein',
            'eishockey',
            'handball',
            'volleyball',
            'basketball',
            'leichtathletik',
            'schwimmverein',
            'radclub',
            'radverein',
            'reitclub',
            'reitverein',
            'kegelclub',
            'kegelverein',
            'sportunion',
            'union ',
        ],
        'verein_tradition' => [
            'trachtenverein',
            'goldhauben',
            'volkstanz',
            'heimatverein',
            'schützenverein',
            'schuetzenverein',
            'schützengilde',
            'schuetzengilde',
            'schützenkompanie',
            'feuerwehr',
            'pfarre',
            'pfarrei',
            'kameradschaft',
            'brauchtum',
            'goldhaubengruppe',
            'krippenfreunde',
        ],

        'bestattung' => [
            'bestatt',
            'beerdig',
            'funeral',
            'trauer',
            'pietät',
            'pietaet',
            'krematorium',
        ],
        'energie' => [
            'photovoltaik',
            'solar',
            'wärmepumpe',
            'waermepumpe',
            'energieberater',
            'pv-anlage',
            'pv anlage',
            'wallbox',
            'e-mobil',
            'haustechnik',
        ],
        'hotel' => [
            'hotel',
            'pension',
            'gasthof',
            'gasthaus',
            'gästehaus',
            'gaestehaus',
            'ferienwohnung',
            'fewo',
            'apartment',
            'bauernhof',
            'urlaub',
            'beherberg',
            'hostel',
            'camping',
            'campingplatz',
            'b&b',
        ],
        'kanzlei' => [
            'anwalt',
            'rechtsanwalt',
            'kanzlei',
            'notar',
            'steuerberat',
            'wirtschaftsprüf',
            'wirtschaftspruef',
            'rechtsberat',
            'mediator',
            'mediation',
            'unternehmensberat',
            'business coach',
            'lawyer',
            'attorney',
        ],
        'fitness' => [
            'fitness',
            'gym',
            'yoga',
            'pilates',
            'tanzschule',
            'tanzstudio',
            'sprachschule',
            'nachhilfe',
            'musikschule',
            'klettern',
            'boulder',
            'tauchschule',
            'schwimmschule',
            'crossfit',
            'workout',
            'fitnessstudio',
        ],
        'galerie' => [
            'fotograf',
            'photographer',
            'videograf',
            'videoproduktion',
            'fotostudio',
            'photo studio',
            'tattoo',
            'piercing',
            'grafikdesign',
            'webagentur',
            'webdesign',
            'hochzeitsplaner',
            'wedding',
        ],
        'autohaus' => [
            'autohaus',
            'gebrauchtwagen',
            'fahrzeughandel',
            'kfz-händler',
            'kfz-haendler',
            'bauträger',
            'bautraeger',
            'immobilien',
            'immobilienmakler',
            'realtor',
        ],
        'einzelhandel' => [
            'boutique',
            'modegeschäft',
            'modegeschaeft',
            'modeladen',
            'fashion store',
            'bioladen',
            'hofladen',
            'buchhandlung',
            'bookstore',
            'blumen',
            'florist',
            'gärtnerei',
            'gaertnerei',
            'optiker',
            'juwelier',
            'goldschmied',
            'sportgeschäft',
            'sportgeschaeft',
            'fahrradhandel',
            'fahrradladen',
            'e-bike',
            'spielwaren',
        ],

        // ─── Existing layouts (checked after specific ones above) ────────────
        'restaurant' => [
            'restaurant',
            'pizzeria',
            'bistro',
            'gastro',
            'cafe',
            'café',
            'kaffee',
            'wirtshaus',
            'wirtschaft',
            'beisl',
            'imbiss',
            'food',
            'kulinarik',
            'küche',
            'kueche',
            'bäckerei',
            'baeckerei',
            'konditorei',
            'eissalon',
            'eisdiele',
            'eiscafe',
            'catering',
            'partyservice',
            'bar ',
            'cocktail',
        ],
        'friseur' => [
            'friseur',
            'frisör',
            'frisoer',
            'hair_salon',
            'hairdress',
            'barber',
            'coiffeur',
            'salon',
            'beauty',
            'kosmetik',
            'nagel',
            'nail',
            'styling',
            'haar',
            'massage',
            'wellness',
            'spa',
            'therme',
        ],
        'tier' => [
            'tierarzt',
            'tierklinik',
            'veterinär',
            'veterinaer',
            'hundeschule',
            'hundetrainer',
            'tierpension',
            'tiersitter',
            'hundefriseur',
            'tierheim',
        ],
        'handwerk' => [
            'maler',
            'lackier',
            'elektrik',
            'elektro',
            'klempner',
            'sanitär',
            'sanitaer',
            'dachdeck',
            'spengler',
            'schreiner',
            'tischler',
            'installateur',
            'fliesenleger',
            'bodenleger',
            'heizung',
            'plumber',
            'electrician',
            'handwerk',
            'baumeister',
            'bau ',
            'gipser',
            'putzer',
            'garten- und landschaft',
            'gartenbau',
            'landschaftsbau',
            'umzug',
            'umzugsfirma',
            'schlüsseldienst',
            'schluesseldienst',
            'reinigung',
            'gebäudereinig',
            'gebaeudereinig',
            'kfz-werkstatt',
            'autowerkstatt',
            'kfz werkstatt',
            'reifen',
            'karosserie',
        ],
        'arzt' => [
            'arzt',
            'ärzt',
            'aerzt',
            'praxis',
            'doktor',
            'doctor',
            'medizin',
            'zahnarzt',
            'orthopäd',
            'orthopaed',
            'physio',
            'ergo',
            'heilpraktiker',
            'therapeut',
            'osteo',
            'chiro',
            'dental',
            'dermatolog',
            'apotheke',
            'pharmacy',
            'hebamme',
        ],
        'verein' => [
            // Generic Verein fallback — only catches the word itself, since
            // music/sport/tradition subtypes above catch the more specific ones.
            'verein',
            'club',
            'jugend',
            'genossenschaft',
        ],
    ];

    public function match(?string ...$inputs): LayoutKind
    {
        $haystack = strtolower(implode(' ', array_filter($inputs)));
        if ($haystack === '') {
            return LayoutKind::Standard;
        }

        foreach (self::PATTERNS as $kind => $patterns) {
            foreach ($patterns as $needle) {
                if ($this->patternMatches($haystack, $needle)) {
                    return LayoutKind::from($kind);
                }
            }
        }

        return LayoutKind::Standard;
    }

    public function confidence(LayoutKind $kind, string ...$inputs): float
    {
        if ($kind === LayoutKind::Standard) {
            return 0.0;
        }

        $haystack = strtolower(implode(' ', array_filter($inputs)));
        $patterns = self::PATTERNS[$kind->value] ?? [];
        if ($patterns === []) {
            return 0.0;
        }

        $hits = 0;
        foreach ($patterns as $needle) {
            if ($this->patternMatches($haystack, $needle)) {
                $hits++;
            }
        }

        return min(1.0, $hits / 3.0);
    }

    /**
     * Short tokens (≤4 chars after normalisation) need word-boundary matching to avoid
     * false positives like 'union ' matching 'Communion Bakery'. Longer needles use
     * substring search for tolerance against compound German words.
     */
    private function patternMatches(string $haystack, string $needle): bool
    {
        $needle = strtolower(trim($needle));
        if ($needle === '') {
            return false;
        }
        if (mb_strlen($needle) <= 4) {
            return preg_match('/\b'.preg_quote($needle, '/').'\b/iu', $haystack) === 1;
        }
        return str_contains($haystack, $needle);
    }
}
