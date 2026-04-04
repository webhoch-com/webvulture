import axios from 'axios';
import { getSetting } from '../models/settings.js';

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = 'places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.types,places.rating';

export async function searchPlaces(query) {
  const apiKey = await getSetting('google_places_api_key');
  if (!apiKey) throw new Error('Google Places API Key nicht konfiguriert.');

  const response = await axios.post(PLACES_URL, {
    textQuery: query,
    languageCode: 'de',
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    timeout: 15000,
  });

  const places = response.data.places || [];
  return places
    .filter(p => p.websiteUri)
    .map(p => ({
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      url: p.websiteUri,
      phone: p.nationalPhoneNumber || '',
      types: p.types || [],
      googleRating: p.rating || null,
    }));
}

export async function searchMultiple(queries, maxResults) {
  const allResults = [];
  const seenUrls = new Set();

  for (const q of queries) {
    if (allResults.length >= maxResults) break;
    try {
      const results = await searchPlaces(q);
      for (const r of results) {
        const normalized = r.url.replace(/\/+$/, '').toLowerCase();
        if (!seenUrls.has(normalized) && allResults.length < maxResults) {
          seenUrls.add(normalized);
          allResults.push(r);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (err) {
      console.error(`Google Places Fehler fuer "${q}":`, err.message);
    }
  }

  return allResults;
}
