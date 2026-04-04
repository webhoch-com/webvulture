import * as Claude from '../services/claude.js';
import * as GooglePlaces from '../services/googlePlaces.js';
import * as WebAnalyzer from '../services/webAnalyzer.js';
import * as Leads from '../models/leads.js';
import * as SearchJobs from '../models/searchJobs.js';

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function startSearch(req, res) {
  const { targetGroup, region, count = 5, manualUrls } = req.body;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let job;
  try {
    job = await SearchJobs.create({
      targetGroup: targetGroup || 'Manuell',
      region: region || '',
      count: parseInt(count),
      userId: req.user.id,
    });

    sendSSE(res, { type: 'job_created', jobId: job.id });

    let websites = [];

    if (manualUrls && manualUrls.length > 0) {
      websites = manualUrls.map(url => ({
        name: '',
        url: url.trim(),
        address: '',
        phone: '',
      }));
      sendSSE(res, { type: 'status', message: `${websites.length} manuelle URLs werden analysiert...` });
    } else {
      if (!targetGroup || !region) {
        sendSSE(res, { type: 'error', message: 'Zielgruppe und Region erforderlich' });
        res.end();
        return;
      }

      sendSSE(res, { type: 'status', message: 'Suchbegriffe werden generiert...' });
      const { terms, cost: searchCost } = await Claude.generateSearchTerms(targetGroup, region, count);
      sendSSE(res, { type: 'search_terms', terms, cost: searchCost });

      sendSSE(res, { type: 'status', message: `${terms.length} Suchbegriffe gefunden. Google Places wird abgefragt...` });
      websites = await GooglePlaces.searchMultiple(terms, parseInt(count));
      sendSSE(res, { type: 'places_found', count: websites.length });

      if (websites.length === 0) {
        sendSSE(res, { type: 'error', message: 'Keine Websites gefunden. Versuche andere Suchbegriffe.' });
        await SearchJobs.update(job.id, { status: 'failed', error_message: 'Keine Ergebnisse' });
        res.end();
        return;
      }
    }

    const total = websites.length;
    let processed = 0;

    for (const site of websites) {
      processed++;
      sendSSE(res, {
        type: 'progress',
        current: site.url,
        progress: processed,
        total,
        step: 'fetching',
      });

      try {
        const analysis = await WebAnalyzer.analyzeUrl(site.url);

        sendSSE(res, {
          type: 'progress',
          current: site.url,
          progress: processed,
          total,
          step: 'analyzing',
        });

        const htmlSnippet = analysis.html.slice(0, 3000);
        const { analysis: aiResult, cost: aiCost } = await Claude.analyzeWebsite(
          site.url, htmlSnippet, analysis
        );

        const lead = await Leads.create({
          name: aiResult.name || site.name || analysis.title || site.url,
          url: site.url,
          email: aiResult.email || '',
          phone: site.phone || '',
          branche: targetGroup || '',
          region: region || '',
          address: site.address || '',
          ssl: analysis.ssl,
          mobile: analysis.mobile,
          speed: analysis.speed,
          rating: aiResult.rating || 2,
          suggestions: aiResult.suggestions || '',
          analysis_raw: { ...aiResult, technical: analysis },
          analysis_cost: aiCost,
          search_job_id: job.id,
        });

        sendSSE(res, {
          type: 'lead_created',
          lead: {
            id: lead.id,
            name: lead.name,
            url: lead.url,
            rating: lead.rating,
            ssl: lead.ssl,
            mobile: lead.mobile,
            speed: lead.speed,
          },
          progress: processed,
          total,
        });
      } catch (err) {
        sendSSE(res, {
          type: 'lead_error',
          url: site.url,
          message: err.message,
          progress: processed,
          total,
        });
      }
    }

    await SearchJobs.update(job.id, { status: 'completed', results_count: processed });
    sendSSE(res, { type: 'completed', jobId: job.id, total: processed });
  } catch (err) {
    console.error('Search error:', err);
    if (job) await SearchJobs.update(job.id, { status: 'failed', error_message: err.message });
    sendSSE(res, { type: 'error', message: err.message });
  }

  res.end();
}
