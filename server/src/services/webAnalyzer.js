import axios from 'axios';
import * as cheerio from 'cheerio';

export async function analyzeUrl(url) {
  const startTime = Date.now();
  let html = '';
  let ssl = false;

  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    ssl = normalizedUrl.startsWith('https');

    const response = await axios.get(normalizedUrl, {
      timeout: 10000,
      maxRedirects: 5,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebhochBot/1.0)' },
      maxContentLength: 2 * 1024 * 1024,
    });

    html = response.data;
    if (typeof html !== 'string') html = '';

    const loadTime = Date.now() - startTime;
    const $ = cheerio.load(html);

    const viewport = $('meta[name="viewport"]').attr('content') || '';
    const mobile = viewport.toLowerCase().includes('width=device-width');
    const h1 = $('h1').first().text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const title = $('title').text().trim();

    const navLinks = [];
    $('nav a, header a, .nav a, .navbar a, .menu a').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length < 50) navLinks.push(text);
    });

    // Kontaktdaten extrahieren
    const fullText = $('body').text();
    const contact = {};

    // Telefonnummern (österreichische Formate)
    const phoneMatches = fullText.match(/(?:\+43|0043|0)\s*[\d\s\/\-\.]{6,15}/g) || [];
    contact.phones = [...new Set(phoneMatches.map(p => p.trim()))].slice(0, 3);

    // Auch aus tel: Links
    $('a[href^="tel:"]').each((_, el) => {
      const tel = $(el).attr('href').replace('tel:', '').trim();
      if (tel && !contact.phones.includes(tel)) contact.phones.push(tel);
    });

    // Email
    const emailMatches = fullText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];
    contact.emails = [...new Set(emailMatches)].slice(0, 3);
    $('a[href^="mailto:"]').each((_, el) => {
      const mail = $(el).attr('href').replace('mailto:', '').split('?')[0].trim();
      if (mail && !contact.emails.includes(mail)) contact.emails.push(mail);
    });

    // Adresse (suche nach PLZ-Mustern: 4-stellig in AT)
    const addressMatches = fullText.match(/\d{4}\s+[A-ZÄÖÜa-zäöüß][\wäöüß\s\-\.]+/g) || [];
    contact.addresses = [...new Set(addressMatches.map(a => a.trim()))].filter(a => a.length > 6 && a.length < 80).slice(0, 2);

    // Öffnungszeiten
    const hoursPatterns = fullText.match(/(?:Mo|Di|Mi|Do|Fr|Sa|So|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)[\s\-–bis]*(?:Mo|Di|Mi|Do|Fr|Sa|So|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)?[\s:]*\d{1,2}[:\.]?\d{0,2}\s*[-–bis]+\s*\d{1,2}[:\.]?\d{0,2}/gi) || [];
    contact.hours = [...new Set(hoursPatterns.map(h => h.trim()))].slice(0, 5);

    const headings = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(text);
    });

    const paragraphs = [];
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 20) paragraphs.push(text);
    });

    // Bilder extrahieren (absolute URLs, dedupliziert) — alle möglichen Attribute prüfen
    const images = [];
    const seenImgUrls = new Set();
    const baseUrl = new URL(normalizedUrl);

    // Alle Elemente mit Bild-Referenzen finden
    $('img, [data-bg], [data-background-image], source').each((_, el) => {
      // Verschiedene Attribute durchprobieren
      const candidates = [
        $(el).attr('src'),
        $(el).attr('data-src'),
        $(el).attr('data-lazy-src'),
        $(el).attr('data-original'),
        $(el).attr('data-bg'),
        $(el).attr('data-background-image'),
        $(el).attr('srcset')?.split(',')[0]?.trim()?.split(' ')[0],
      ].filter(Boolean);

      for (const src of candidates) {
        try {
          const imgUrl = new URL(src, normalizedUrl).href;
          if (seenImgUrls.has(imgUrl)) continue;
          seenImgUrls.add(imgUrl);
          const alt = $(el).attr('alt') || '';
          if (imgUrl.match(/\.(jpg|jpeg|png|webp)/i)
              && !imgUrl.includes('1x1') && !imgUrl.includes('pixel')
              && !imgUrl.includes('gravatar') && !imgUrl.includes('emoji')
              && !imgUrl.includes('smilies') && !imgUrl.includes('admin-bar')) {
            images.push({ src: imgUrl, alt });
          }
        } catch {}
      }
    });

    // Auch CSS background-images parsen
    $('[style*="background"]').each((_, el) => {
      const style = $(el).attr('style') || '';
      const bgMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (bgMatch) {
        try {
          const imgUrl = new URL(bgMatch[1], normalizedUrl).href;
          if (!seenImgUrls.has(imgUrl) && imgUrl.match(/\.(jpg|jpeg|png|webp)/i)) {
            seenImgUrls.add(imgUrl);
            images.push({ src: imgUrl, alt: 'Hintergrundbild' });
          }
        } catch {}
      }
    });

    // Logo suchen
    let logoUrl = '';
    const logoEl = $('header img, .logo img, [class*="logo"] img, a[class*="brand"] img, .site-logo img, .custom-logo').first();
    if (logoEl.length) {
      const logoSrc = logoEl.attr('src') || logoEl.attr('data-src');
      if (logoSrc) {
        try { logoUrl = new URL(logoSrc, normalizedUrl).href; } catch {}
      }
    }

    // Farben extrahieren — umfassend aus CSS, inline styles UND class-basierte Divi/WP-Farben
    const colors = new Set();
    const GENERIC_COLORS = new Set(['#000000', '#000', '#fff', '#ffffff', '#abb8c3', '#f78da7', '#cf2e2e', '#ff6900', '#fcb900', '#7bdcb5', '#00d084', '#8ed1fc', '#0693e3', '#9b51e0']);

    // Aus <style> Tags
    $('style').each((_, el) => {
      const css = $(el).text();
      const colorMatches = css.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      colorMatches.forEach(c => { if (!GENERIC_COLORS.has(c.toLowerCase())) colors.add(c); });
    });
    // Aus inline styles
    $('[style]').each((_, el) => {
      const style = $(el).attr('style') || '';
      const colorMatches = style.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      colorMatches.forEach(c => { if (!GENERIC_COLORS.has(c.toLowerCase())) colors.add(c); });
      // Auch rgb/rgba Werte
      const rgbMatches = style.match(/rgba?\([^)]+\)/g) || [];
      rgbMatches.forEach(c => colors.add(c));
    });
    // Aus data-Attributen (Divi, Elementor, etc.)
    $('[data-bg-color], [data-text-color]').each((_, el) => {
      const bg = $(el).attr('data-bg-color');
      const txt = $(el).attr('data-text-color');
      if (bg) colors.add(bg);
      if (txt) colors.add(txt);
    });
    // Aus CSS-Klassen die auf Farben hindeuten (z.B. Divi: et_pb_bg_layout_dark → dunkler Hintergrund)
    // Suche auch in externen CSS-Dateien nach häufigen Farben
    $('link[rel="stylesheet"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('style') && !href.includes('fonts.googleapis')) {
        // Merke uns die CSS-URL für eventuelle spätere Analyse
      }
    });

    let speed = 'OK';
    if (loadTime > 5000) speed = 'Langsam';
    else if (loadTime > 2000) speed = 'Mittel';

    return {
      html,
      ssl,
      mobile,
      speed,
      loadTimeMs: loadTime,
      h1: !!h1,
      h1Text: h1,
      metaDesc: !!metaDesc,
      metaDescText: metaDesc,
      title,
      navLinks: [...new Set(navLinks)].slice(0, 15),
      headings: headings.slice(0, 20),
      paragraphs: paragraphs.slice(0, 10),
      images: images.slice(0, 20),
      logoUrl,
      colors: [...colors].slice(0, 15),
      contact,
    };
  } catch (err) {
    if (!ssl && !url.startsWith('http')) {
      try {
        const response = await axios.get(`http://${url}`, {
          timeout: 10000,
          maxRedirects: 5,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WebhochBot/1.0)' },
          maxContentLength: 2 * 1024 * 1024,
        });
        html = typeof response.data === 'string' ? response.data : '';
        const $ = cheerio.load(html);
        return {
          html,
          ssl: false,
          mobile: !!$('meta[name="viewport"]').attr('content')?.includes('width=device-width'),
          speed: 'Langsam',
          loadTimeMs: Date.now() - startTime,
          h1: !!$('h1').first().text().trim(),
          h1Text: $('h1').first().text().trim(),
          metaDesc: !!$('meta[name="description"]').attr('content'),
          metaDescText: $('meta[name="description"]').attr('content') || '',
          title: $('title').text().trim(),
          navLinks: [],
          headings: [],
          paragraphs: [],
        };
      } catch {
        throw new Error(`Website nicht erreichbar: ${url}`);
      }
    }
    throw new Error(`Website nicht erreichbar: ${url} — ${err.message}`);
  }
}
