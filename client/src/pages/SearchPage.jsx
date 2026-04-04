import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, XCircle, Loader, ArrowRight } from 'lucide-react';

export default function SearchPage() {
  const [form, setForm] = useState({ targetGroup: '', region: '', count: 5, manualUrls: '' });
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [jobId, setJobId] = useState(null);
  const abortRef = useRef(null);
  const navigate = useNavigate();

  const startSearch = async (e) => {
    e.preventDefault();
    setRunning(true);
    setEvents([]);
    setProgress({ current: 0, total: 0 });
    setJobId(null);

    const body = { ...form, count: parseInt(form.count) };
    if (form.manualUrls.trim()) {
      body.manualUrls = form.manualUrls.split('\n').map(u => u.trim()).filter(Boolean);
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              setEvents(prev => [...prev, data]);

              if (data.type === 'progress') {
                setProgress({ current: data.progress, total: data.total });
              }
              if (data.type === 'job_created') setJobId(data.jobId);
              if (data.type === 'completed') setJobId(data.jobId);
            } catch {}
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setEvents(prev => [...prev, { type: 'error', message: err.message }]);
      }
    } finally {
      setRunning(false);
    }
  };

  const completed = events.find(e => e.type === 'completed');
  const leadsCreated = events.filter(e => e.type === 'lead_created');

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-6">Website Suche & Analyse</h1>

      <form onSubmit={startSearch} className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-gray-300 text-sm mb-1.5">Zielgruppe</label>
            <input type="text" value={form.targetGroup} onChange={e => setForm({ ...form, targetGroup: e.target.value })}
              placeholder="z.B. Gasthaeuser, Handwerker..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1.5">Region</label>
            <input type="text" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}
              placeholder="z.B. Bezirk Voecklabruck..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1.5">Anzahl</label>
            <input type="number" min="1" max="50" value={form.count} onChange={e => setForm({ ...form, count: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 text-sm mb-1.5">Manuelle URLs (optional, eine pro Zeile)</label>
          <textarea value={form.manualUrls} onChange={e => setForm({ ...form, manualUrls: e.target.value })}
            rows={3} placeholder="https://example.com&#10;https://another-site.at"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm" />
        </div>

        <button type="submit" disabled={running || (!form.targetGroup && !form.manualUrls.trim())}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors">
          {running ? <><Loader className="w-4 h-4 animate-spin" /> Suche laeuft...</> : <><Search className="w-4 h-4" /> Suche starten</>}
        </button>
      </form>

      {/* Progress */}
      {events.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          {progress.total > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>{progress.current} von {progress.total}</span>
                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event, i) => (
              <div key={i} className="text-sm flex items-start gap-2">
                {event.type === 'status' && <span className="text-blue-400">{event.message}</span>}
                {event.type === 'lead_created' && (
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> {event.lead.name} — Rating {event.lead.rating}
                  </span>
                )}
                {event.type === 'lead_error' && (
                  <span className="text-red-400 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> {event.url}: {event.message}
                  </span>
                )}
                {event.type === 'error' && <span className="text-red-400">{event.message}</span>}
                {event.type === 'search_terms' && <span className="text-gray-400">{event.terms.length} Suchbegriffe generiert</span>}
                {event.type === 'places_found' && <span className="text-gray-400">{event.count} Websites gefunden</span>}
                {event.type === 'completed' && (
                  <span className="text-green-400 font-medium">Suche abgeschlossen: {event.total} Websites analysiert</span>
                )}
              </div>
            ))}
          </div>

          {completed && (
            <button onClick={() => navigate('/dashboard')}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
              Zum Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
