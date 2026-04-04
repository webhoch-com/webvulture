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
