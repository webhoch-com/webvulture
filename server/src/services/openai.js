import { getSetting } from '../models/settings.js';

async function callGPT(systemPrompt, userMessage, maxTokens = 4096) {
  const apiKey = await getSetting('openai_api_key');
  if (!apiKey) throw new Error('OpenAI API Key nicht konfiguriert. Bitte unter Einstellungen hinterlegen.');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5.4',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API Fehler: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function createWebsiteBrief(websiteData) {
  const currentYear = new Date().getFullYear();

  const systemPrompt = `Du bist ein erfahrener Web-Analyst und Design-Berater. Analysiere die Website-Daten und erstelle ein präzises Design-Brief für einen Webdesigner.

## SCHRITT 1: BRANCHE ANALYSIEREN

Bevor du das Brief erstellst, überlege dir:
- Welche Branche hat dieses Unternehmen/dieser Verein?
- Welche professionellen Websites gibt es in dieser Branche als Vorbild? (z.B. für Musikvereine: sportunion-regau.at, webhoch.com; für Handwerker: kanal-fellner.at, installateur-websites)
- Welcher Design-Stil passt zur Branche? (z.B. sportlich-dynamisch für Vereine, seriös-professionell für Handwerker, warm-einladend für Gastronomie)
- Welche typischen Sections haben gute Websites in dieser Branche?

Beschreibe im Feld "designstil" konkret welchen Look die Website haben soll — OHNE eine bestehende Website 1:1 zu kopieren, aber inspiriert von Best Practices der Branche.

## ABSOLUTE REGELN — KEINE AUSNAHMEN

1. ERFINDE NIEMALS Daten! Keine Telefonnummern, keine Adressen, keine PLZ, keine Emails, keine Namen, keine Fakten.
2. Wenn du dir bei einem Datum NICHT 100% sicher bist → schreibe "Nicht verfügbar"
3. Verwende NIEMALS Platzhalter wie "12345", "+43 XXX", "Musterstraße" etc.
4. ALLE Team-Mitglieder müssen aufgelistet werden — nicht nur einer! Jede Person mit Name und exakter Rolle.
5. Adressen IMMER vollständig mit Straße UND PLZ wie in den Originaldaten
6. Copyright-Jahr ist IMMER ${currentYear}

## AUSGABE-FORMAT

Antworte NUR mit diesem JSON:
{
  "firmenname": "Exakter Name aus den Daten",
  "branche": "Branche",
  "beschreibung": "2-3 Sätze basierend NUR auf den gegebenen Texten",
  "kontakt": {
    "telefon": ["Nur exakte Nummern aus den Daten"],
    "email": ["Nur exakte Emails aus den Daten"],
    "adressen": ["Vollständige Adressen mit Straße + PLZ + Ort"],
    "oeffnungszeiten": "Exakt aus den Daten oder 'Nicht verfügbar'"
  },
  "team": [
    {"name": "Vorname Nachname", "rolle": "Exakte Bezeichnung aus der Website", "bild_url": "URL falls vorhanden"}
  ],
  "farben": {
    "primaer": "#hexcode — Hauptfarbe erkannt aus Buttons, Links, Logo",
    "sekundaer": "#hexcode — Zweite Farbe",
    "erklaerung": "Woher die Farbe abgeleitet wurde"
  },
  "logo": {
    "url": "Logo-URL oder null"
  },
  "bilder_wichtig": "ALLE verfügbaren Bilder MÜSSEN auf der Website verwendet werden! Weise jedem Bild einen konkreten Platz zu.",
  "bilder": [
    {"url": "Exakte Bild-URL", "verwendung": "Konkreter Platz: Hero-Hintergrund / Über-uns rechts / Team-Card / Service-Header / Galerie", "beschreibung": "Was zeigt das Bild"}
  ],
  "seitenstruktur": [
    {"section": "Hero", "titel": "Text aus der Website", "untertitel": "Text aus der Website", "cta_text": "Passender CTA"},
    {"section": "Über uns", "inhalt": "NUR Text aus der Original-Website, keine Erfindungen"},
    {"section": "Team", "inhalt": "ALLE Team-Mitglieder mit Name, Rolle und Bild (falls im Brief vorhanden)"},
    {"section": "Leistungen", "items": [{"titel": "...", "text": "NUR echte Beschreibungen"}]},
    {"section": "Kontakt", "inhalt": "ALLE Kontaktdaten exakt"},
    {"section": "Footer", "inhalt": "Firmenname, Standorte, Impressum-Link, © ${currentYear}"}
  ],
  "designstil": {
    "branche_analyse": "Welche Branche, welche Zielgruppe, welcher Ton",
    "inspiriert_von": "Welche Art von Websites als Vorbild dienen (NICHT kopieren, nur Stil-Inspiration)",
    "farbwelt": "Warme/kalte/neutrale Farben, basierend auf Branche und Logo",
    "layout_empfehlung": "Welche Sections und welches Layout am besten passt",
    "besondere_elemente": "Branchenspezifische Elemente (z.B. Galerie für Vereine, Referenzen für Handwerker, Speisekarte für Gastronomie)"
  },
  "warnungen": ["Liste von Informationen die nicht gefunden wurden und daher NICHT auf die Website sollen"]
}

WICHTIG: Das "warnungen"-Feld hilft dem Designer zu wissen was er WEGLASSEN soll statt etwas zu erfinden.
WICHTIG: Das "designstil"-Feld gibt dem Designer kreative Richtung basierend auf der Branche — NICHT 1:1 kopieren, sondern Best Practices adaptieren.`;

  const result = await callGPT(systemPrompt, websiteData, 6000);

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : result);
  } catch {
    console.error('OpenAI JSON Parse Fehler:', result.slice(0, 500));
    return null;
  }
}
