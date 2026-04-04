import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
              if (data.type === 'completed') {
                setJobId(data.jobId);
                toast.success(`Suche abgeschlossen: ${data.total} Website(s) analysiert`);
              }
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
              placeholder="z.B. Gasthäuser, Handwerker..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-1.5">Region</label>
            <input type="text" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })}
              placeholder="z.B. Bezirk Vöcklabruck..."
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
          {running ? <><Loader className="w-4 h-4 animate-spin" /> Suche läuft...</> : <><Search className="w-4 h-4" /> Suche starten</>}
        </button>
      </form>

      {/* Suchfortschritt */}
      {events.length > 0 && (
        <div className="space-y-4">
          {/* Fortschrittsbalken */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            {/* Schritte-Anzeige */}
            <div className="flex items-center gap-2 mb-4">
              {[
                { key: 'terms', label: 'Suchbegriffe', done: events.some(e => e.type === 'search_terms' || e.type === 'status' && e.message?.includes('manuelle')) },
                { key: 'places', label: 'Websites finden', done: events.some(e => e.type === 'places_found' || e.type === 'progress') },
                { key: 'analyze', label: 'Analysieren', done: progress.current > 0 },
                { key: 'done', label: 'Fertig', done: !!completed },
              ].map((step, i) => (
                <div key={step.key} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    step.done ? 'bg-green-500 text-white' : running ? 'bg-blue-500/30 text-blue-400 animate-pulse' : 'bg-gray-700 text-gray-500'
                  }`}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs hidden md:block ${step.done ? 'text-green-400' : 'text-gray-500'}`}>{step.label}</span>
                  {i < 3 && <div className={`flex-1 h-0.5 ${step.done ? 'bg-green-500' : 'bg-gray-700'}`} />}
                </div>
              ))}
            </div>

            {/* Balken */}
            {progress.total > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white font-medium">
                    {completed ? 'Analyse abgeschlossen' : `Analysiere Website ${progress.current} von ${progress.total}...`}
                  </span>
                  <span className="text-blue-400 font-bold">{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${completed ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                </div>
              </div>
            )}

            {/* Aktueller Schritt */}
            {running && !completed && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader className="w-3.5 h-3.5 animate-spin text-blue-400" />
                {events[events.length - 1]?.type === 'progress'
                  ? `${events[events.length - 1].step === 'fetching' ? 'Lade' : 'Analysiere'}: ${events[events.length - 1].current}`
                  : events[events.length - 1]?.message || 'Bitte warten...'}
              </div>
            )}
          </div>

          {/* Ergebnisse */}
          {leadsCreated.length > 0 && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <h3 className="text-white font-medium mb-3">Gefundene Websites ({leadsCreated.length})</h3>
              <div className="space-y-2">
                {leadsCreated.map((event, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-700/40 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="text-white text-sm">{event.lead.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className={event.lead.ssl ? 'text-green-400' : 'text-red-400'}>{event.lead.ssl ? 'SSL ✓' : 'Kein SSL'}</span>
                      <span className={`font-bold ${event.lead.rating === 3 ? 'text-red-400' : event.lead.rating === 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                        Rating {event.lead.rating}/3
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fehler */}
          {events.filter(e => e.type === 'lead_error' || e.type === 'error').length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              {events.filter(e => e.type === 'lead_error' || e.type === 'error').map((event, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-red-400">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  {event.type === 'lead_error' ? `${event.url}: ${event.message}` : event.message}
                </div>
              ))}
            </div>
          )}

          {/* Zum Dashboard */}
          {completed && (
            <button onClick={() => navigate('/dashboard')}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium">
              Zum Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
