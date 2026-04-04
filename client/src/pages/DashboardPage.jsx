import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { Search, ChevronLeft, ChevronRight, Shield, Smartphone, Gauge, Star, ExternalLink, Cpu, HardDrive, MemoryStick, Clock, Euro } from 'lucide-react';

const RATING_COLORS = { 1: 'text-green-400', 2: 'text-yellow-400', 3: 'text-red-400' };

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

export default function DashboardPage() {
  const [data, setData] = useState({ leads: [], total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const page = parseInt(searchParams.get('page') || '1');
  const status = searchParams.get('status') || '';
  const rating = searchParams.get('rating') || '';
  const branche = searchParams.get('branche') || '';
  const search = searchParams.get('search') || '';

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25, sort: 'created_at', order: 'desc' };
      if (status) params.status = status;
      if (rating) params.rating = rating;
      if (branche) params.branche = branche;
      if (search) params.search = search;
      const res = await api.get('/leads', { params });
      setData(res.data);
    } catch (err) {
      console.error('Fehler beim Laden:', err);
    } finally {
      setLoading(false);
    }
  }, [page, status, rating, branche, search]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    api.get('/stats/server').then(res => setStats(res.data)).catch(() => {});
    const interval = setInterval(() => {
      api.get('/stats/server').then(res => setStats(res.data)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleBulkAction = async (newStatus) => {
    if (selected.size === 0) return;
    try {
      await api.post('/leads/bulk-action', { ids: [...selected], status: newStatus });
      setSelected(new Set());
      fetchLeads();
    } catch (err) {
      console.error('Bulk action error:', err);
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === data.leads.length) setSelected(new Set());
    else setSelected(new Set(data.leads.map(l => l.id)));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm">{data.total} Leads insgesamt</p>
        </div>
        <button onClick={() => navigate('/search')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Search className="w-4 h-4" /> Neue Suche
        </button>
      </div>

      {/* Server Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1"><Cpu className="w-3.5 h-3.5" /> CPU</div>
            <div className="text-white text-lg font-bold">{stats.cpu.usage}%</div>
            <div className="h-1.5 bg-gray-700 rounded-full mt-1"><div className={`h-full rounded-full ${stats.cpu.usage > 80 ? 'bg-red-500' : stats.cpu.usage > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{width: `${stats.cpu.usage}%`}} /></div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1"><MemoryStick className="w-3.5 h-3.5" /> RAM</div>
            <div className="text-white text-lg font-bold">{stats.memory.percent}%</div>
            <div className="text-gray-500 text-xs">{formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1"><HardDrive className="w-3.5 h-3.5" /> Disk</div>
            <div className="text-white text-lg font-bold">{stats.disk.percent}%</div>
            <div className="text-gray-500 text-xs">{formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1"><Clock className="w-3.5 h-3.5" /> Uptime</div>
            <div className="text-white text-lg font-bold">{formatUptime(stats.uptime)}</div>
            <div className="text-gray-500 text-xs">{stats.leads.total} Leads</div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1"><Euro className="w-3.5 h-3.5" /> Kosten</div>
            <div className="text-white text-lg font-bold">{stats.leads.totalCosts.toFixed(2)} €</div>
            <div className="text-gray-500 text-xs">Gesamt API-Kosten</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Suche..."
            value={search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm w-48 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select value={status} onChange={(e) => updateFilter('status', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">Alle Status</option>
          <option value="new">Neu</option>
          <option value="approved">Freigegeben</option>
          <option value="teaser_generated">Teaser erstellt</option>
          <option value="email_generated">Email erstellt</option>
          <option value="contacted">Kontaktiert</option>
          <option value="follow_up">Follow-up</option>
          <option value="responded">Gemeldet</option>
          <option value="no_interest">Kein Interesse</option>
          <option value="meeting">Termin</option>
          <option value="won">Gewonnen</option>
          <option value="archived">Archiviert</option>
        </select>
        <select value={rating} onChange={(e) => updateFilter('rating', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500">
          <option value="">Alle Ratings</option>
          <option value="1">1 - Gut</option>
          <option value="2">2 - Mittel</option>
          <option value="3">3 - Schlecht</option>
        </select>
        <input
          type="text"
          placeholder="Branche..."
          value={branche}
          onChange={(e) => updateFilter('branche', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm w-40 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2">
          <span className="text-blue-400 text-sm">{selected.size} ausgewählt</span>
          <button onClick={() => handleBulkAction('approved')} className="text-yellow-400 text-sm hover:underline">Freigeben</button>
          <button onClick={() => handleBulkAction('contacted')} className="text-teal-400 text-sm hover:underline">Als kontaktiert markieren</button>
          <button onClick={() => handleBulkAction('archived')} className="text-gray-400 text-sm hover:underline">Archivieren</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-3 text-left">
                  <input type="checkbox" checked={selected.size === data.leads.length && data.leads.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="p-3 text-left text-gray-400 font-medium">Name</th>
                <th className="p-3 text-left text-gray-400 font-medium">URL</th>
                <th className="p-3 text-left text-gray-400 font-medium">Branche</th>
                <th className="p-3 text-center text-gray-400 font-medium"><Shield className="w-3.5 h-3.5 inline" /></th>
                <th className="p-3 text-center text-gray-400 font-medium"><Smartphone className="w-3.5 h-3.5 inline" /></th>
                <th className="p-3 text-center text-gray-400 font-medium"><Gauge className="w-3.5 h-3.5 inline" /></th>
                <th className="p-3 text-center text-gray-400 font-medium"><Star className="w-3.5 h-3.5 inline" /></th>
                <th className="p-3 text-left text-gray-400 font-medium">Status</th>
                <th className="p-3 text-right text-gray-400 font-medium">Kosten</th>
                <th className="p-3 text-right text-gray-400 font-medium">Erstellt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="p-8 text-center text-gray-500">Laden...</td></tr>
              ) : data.leads.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-gray-500">Keine Leads gefunden</td></tr>
              ) : data.leads.map(lead => (
                <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer transition-colors">
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)} className="rounded" />
                  </td>
                  <td className="p-3 text-white font-medium max-w-[200px] truncate">{lead.name || '-'}</td>
                  <td className="p-3 text-blue-400 max-w-[200px] truncate">
                    <a href={lead.url} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}
                      className="hover:underline flex items-center gap-1">
                      {lead.url.replace(/^https?:\/\//, '').slice(0, 30)} <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                  <td className="p-3 text-gray-300">{lead.branche || '-'}</td>
                  <td className="p-3 text-center">{lead.ssl ? <span className="text-green-400">Ja</span> : <span className="text-red-400">Nein</span>}</td>
                  <td className="p-3 text-center">{lead.mobile ? <span className="text-green-400">Ja</span> : <span className="text-red-400">Nein</span>}</td>
                  <td className="p-3 text-center text-gray-300">{lead.speed}</td>
                  <td className="p-3 text-center"><span className={RATING_COLORS[lead.rating] || 'text-gray-400'}>{lead.rating || '-'}</span></td>
                  <td className="p-3"><StatusBadge status={lead.status} /></td>
                  <td className="p-3 text-right text-gray-300">{parseFloat(lead.total_cost || 0).toFixed(2)} EUR</td>
                  <td className="p-3 text-right text-gray-500 text-xs">{new Date(lead.created_at).toLocaleDateString('de-AT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <span className="text-gray-400 text-sm">Seite {page} von {data.pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1}
                onClick={() => { const p = new URLSearchParams(searchParams); p.set('page', page - 1); setSearchParams(p); }}
                className="p-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page >= data.pages}
                onClick={() => { const p = new URLSearchParams(searchParams); p.set('page', page + 1); setSearchParams(p); }}
                className="p-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
