export function TEASER_GENERATION_PROMPT(leadData, designWishes) {
  return `Du bist ein Senior Webdesigner der Webagentur Hochmeir e.U. (webhoch.com).

Erstelle ein komplettes HTML-Redesign der Website "${leadData.name}" (${leadData.url}) als einzelne HTML-Datei.

ANFORDERUNGEN:
1. Verwende die GLEICHEN Inhalte der Originalwebsite (Texte, Ueberschriften, Navigation), aber in einem modernen, professionellen Design
2. Single-File HTML mit eingebettetem CSS (<style> im <head>)
3. Kein externes JavaScript, keine externen CSS-Dateien (ausser Google Fonts via <link>)
4. Kein Tracking, keine Analytics, keine Cookies, keine externen Scripts
5. Vollstaendig responsive (Desktop, Tablet, Handy)
6. Modernes Design mit sauberer Typografie und ansprechendem Layout

PFLICHT-ELEMENTE:
- Disclaimer-Banner ganz oben (position: fixed, z-index: 9999, volle Breite):
  Hintergrund #1a1a2e, Text weiss, Text: "Dies ist ein unverbindlicher Entwurf der Webagentur Hochmeir e.U. — Mehr erfahren unter webhoch.com"
  "webhoch.com" als Link zu https://webhoch.com
- Impressum-Link im Footer, verlinkt auf https://webhoch.com/impressum
- Footer-Text: "Entwurf erstellt von Webagentur Hochmeir e.U."
- Navigation soll visuell vorhanden sein, Links koennen aber "#" sein (nur Startseite)
- Body braucht padding-top fuer den fixen Disclaimer-Banner

${designWishes ? `DESIGN-WUENSCHE DES KUNDEN:\n${designWishes}\n` : ''}
VERBESSERUNGSVORSCHLAEGE aus der Analyse:
${leadData.suggestions || 'Keine spezifischen Vorschlaege'}

Antworte NUR mit dem kompletten HTML-Code, beginnend mit <!DOCTYPE html>. Keine Erklaerung davor oder danach.`;
}
