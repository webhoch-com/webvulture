import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, ExternalLink, Globe, Mail, Copy, RefreshCw, Loader, Check, Shield, Smartphone, Gauge } from 'lucide-react';

const TABS = ['Uebersicht', 'Teaser', 'Email', 'Kosten'];

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Uebersicht');
  const [teaserLoading, setTeaserLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [designWishes, setDesignWishes] = useState('');
  const [changeRequest, setChangeRequest] = useState('');
  const [changes, setChanges] = useState([]);
  const [copied, setCopied] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState('');

  const fetchLead = async () => {
    try {
      const res = await api.get(`/leads/${id}`);
      setLead(res.data);
      setDesignWishes(res.data.design_wishes || '');
      setStatusUpdate(res.data.status);
    } catch { navigate('/dashboard'); }
    finally { setLoading(false); }
  };

  const fetchChanges = async () => {
    try {
      const res = await api.get(`/leads/${id}/teaser/changes`);
      setChanges(res.data);
    } catch {}
  };

  useEffect(() => { fetchLead(); fetchChanges(); }, [id]);

  const generateTeaser = async () => {
    setTeaserLoading(true);
    try {
      await api.post(`/leads/${id}/teaser`, { designWishes });
      await fetchLead();
      setTab('Teaser');
    } catch (err) {
      alert(err.response?.data?.message || 'Fehler bei Teaser-Generierung');
    } finally { setTeaserLoading(false); }
  };

  const requestChange = async () => {
    if (!changeRequest.trim()) return;
    setChangeLoading(true);
    try {
      await api.post(`/leads/${id}/teaser/change`, { changeRequest });
      setChangeRequest('');
      await fetchLead();
      await fetchChanges();
    } catch (err) {
      alert(err.response?.data?.message || 'Fehler bei Aenderung');
    } finally { setChangeLoading(false); }
  };

  const generateEmail = async () => {
    setEmailLoading(true);
    try {
      await api.post(`/leads/${id}/email`);
      await fetchLead();
      setTab('Email');
    } catch (err) {
      alert(err.response?.data?.message || 'Fehler bei Email-Generierung');
    } finally { setEmailLoading(false); }
  };

  const regenerateEmail = async () => {
    setEmailLoading(true);
    try {
      await api.post(`/leads/${id}/email/regenerate`);
      await fetchLead();
    } catch (err) {
      alert(err.response?.data?.message || 'Fehler');
    } finally { setEmailLoading(false); }
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(lead.email_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateStatus = async (newStatus) => {
    try {
      await api.put(`/leads/${id}/status`, { status: newStatus });
      setStatusUpdate(newStatus);
      await fetchLead();
    } catch {}
  };

  const handleArchive = async () => {
    try {
      await api.post(`/leads/${id}/archive`);
      await fetchLead();
    } catch (err) {
      alert(err.response?.data?.message || 'Fehler beim Archivieren');
    }
  };

  const handleRestore = async () => {
    try {
      await api.post(`/leads/${id}/restore`);
      await fetchLead();
    } catch (err) {
      alert(err.response?.data?.message || 'Fehler beim Wiederherstellen');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader className="w-6 h-6 animate-spin text-blue-500" /></div>;
  if (!lead) return null;

  const teaserUrl = lead.teaser_subdomain ? `https://${lead.teaser_subdomain}.webseiten-werkstatt.at` : null;

  return (
    <div className="p-6 max-w-5xl">
      <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white flex items-center gap-1 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Zurueck
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{lead.name || 'Unbenannt'}</h1>
          <a href={lead.url} target="_blank" rel="noopener" className="text-blue-400 hover:underline text-sm flex items-center gap-1">
            {lead.url} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={lead.status} />
          <select value={statusUpdate} onChange={(e) => updateStatus(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm">
            <option value="new">Neu</option>
            <option value="approved">Freigegeben</option>
            <option value="teaser_generated">Teaser erstellt</option>
            <option value="email_generated">Email erstellt</option>
            <option value="contacted">Kontaktiert</option>
            <option value="archived">Archiviert</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-700">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'Uebersicht' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCard icon={<Shield className="w-5 h-5" />} label="SSL" value={lead.ssl ? 'Ja' : 'Nein'} color={lead.ssl ? 'text-green-400' : 'text-red-400'} />
            <InfoCard icon={<Smartphone className="w-5 h-5" />} label="Mobile" value={lead.mobile ? 'Ja' : 'Nein'} color={lead.mobile ? 'text-green-400' : 'text-red-400'} />
            <InfoCard icon={<Gauge className="w-5 h-5" />} label="Speed" value={lead.speed} color="text-gray-300" />
            <InfoCard label="Rating" value={`${lead.rating}/3`} color={lead.rating === 3 ? 'text-red-400' : lead.rating === 2 ? 'text-yellow-400' : 'text-green-400'} />
          </div>

          {lead.email && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <span className="text-gray-400 text-sm">Kontakt-Email: </span>
              <a href={`mailto:${lead.email}`} className="text-blue-400 hover:underline">{lead.email}</a>
            </div>
          )}

          {lead.suggestions && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h3 className="text-white font-medium mb-2">Verbesserungsvorschlaege</h3>
              <p className="text-gray-300 text-sm whitespace-pre-line">{lead.suggestions}</p>
            </div>
          )}

          <div className="flex gap-3">
            {!lead.teaser_html && (
              <button onClick={generateTeaser} disabled={teaserLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                {teaserLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                Teaser generieren
              </button>
            )}
            {lead.teaser_html && !lead.email_text && (
              <button onClick={generateEmail} disabled={emailLoading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                {emailLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Email generieren
              </button>
            )}
            {lead.status !== 'archived' && lead.teaser_subdomain && (
              <button onClick={handleArchive} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">Archivieren</button>
            )}
            {lead.status === 'archived' && (
              <button onClick={handleRestore} className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm">Wiederherstellen</button>
            )}
          </div>
        </div>
      )}

      {/* Teaser Tab */}
      {tab === 'Teaser' && (
        <div className="space-y-4">
          {!lead.teaser_html ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <h3 className="text-white font-medium mb-3">Teaser generieren</h3>
              <textarea value={designWishes} onChange={e => setDesignWishes(e.target.value)} rows={3}
                placeholder="Design-Wuensche (optional)..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-blue-500" />
              <button onClick={generateTeaser} disabled={teaserLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                {teaserLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                {teaserLoading ? 'Wird generiert...' : 'Teaser generieren'}
              </button>
            </div>
          ) : (
            <>
              {teaserUrl && (
                <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-xl p-3">
                  <span className="text-gray-400 text-sm">Live:</span>
                  <a href={teaserUrl} target="_blank" rel="noopener" className="text-blue-400 hover:underline text-sm flex items-center gap-1">
                    {teaserUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                  <span className="text-gray-400 text-sm">Vorschau</span>
                </div>
                <iframe srcDoc={lead.teaser_html} className="w-full h-[600px] bg-white" title="Teaser Preview" sandbox="allow-same-origin" />
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="text-white font-medium mb-2">Aenderungswunsch</h3>
                <textarea value={changeRequest} onChange={e => setChangeRequest(e.target.value)} rows={3}
                  placeholder="Beschreibe deine Aenderungswuensche..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-blue-500" />
                <button onClick={requestChange} disabled={changeLoading || !changeRequest.trim()}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                  {changeLoading ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {changeLoading ? 'Wird angepasst...' : 'Aenderung anfordern'}
                </button>
              </div>

              {changes.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-3">Aenderungshistorie</h3>
                  <div className="space-y-2">
                    {changes.map(c => (
                      <div key={c.id} className="flex justify-between items-start p-2 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-300 text-sm">{c.change_request}</span>
                        <span className="text-gray-500 text-xs shrink-0 ml-3">{new Date(c.created_at).toLocaleDateString('de-AT')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Email Tab */}
      {tab === 'Email' && (
        <div className="space-y-4">
          {!lead.email_text ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 text-center">
              <p className="text-gray-400 mb-3">{lead.teaser_html ? 'Noch keine Email generiert.' : 'Zuerst einen Teaser generieren.'}</p>
              {lead.teaser_html && (
                <button onClick={generateEmail} disabled={emailLoading}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto text-sm">
                  {emailLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Email generieren
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-white font-medium">Email-Text</h3>
                  <div className="flex gap-2">
                    <button onClick={copyEmail}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Kopiert!' : 'Kopieren'}
                    </button>
                    <button onClick={regenerateEmail} disabled={emailLoading}
                      className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm">
                      <RefreshCw className={`w-3.5 h-3.5 ${emailLoading ? 'animate-spin' : ''}`} /> Neu generieren
                    </button>
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
                  {lead.email_text}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Costs Tab */}
      {tab === 'Kosten' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-3 text-left text-gray-400">Posten</th>
                <th className="p-3 text-right text-gray-400">Kosten (EUR)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-700/50">
                <td className="p-3 text-gray-300">Analyse</td>
                <td className="p-3 text-right text-white">{parseFloat(lead.analysis_cost || 0).toFixed(4)}</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="p-3 text-gray-300">Teaser-Generierung</td>
                <td className="p-3 text-right text-white">{parseFloat(lead.teaser_cost || 0).toFixed(4)}</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="p-3 text-gray-300">Email-Generierung</td>
                <td className="p-3 text-right text-white">{parseFloat(lead.email_cost || 0).toFixed(4)}</td>
              </tr>
              <tr className="bg-gray-700/30">
                <td className="p-3 text-white font-medium">Gesamt</td>
                <td className="p-3 text-right text-white font-medium">{parseFloat(lead.total_cost || 0).toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value, color = 'text-white' }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">{icon} {label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}
