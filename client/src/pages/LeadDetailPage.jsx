import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { ArrowLeft, ExternalLink, Globe, Mail, Copy, RefreshCw, Loader, Check, Shield, Smartphone, Gauge } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = ['Übersicht', 'Teaser', 'Email', 'Follow-up', 'Kosten'];

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Übersicht');
  const [teaserLoading, setTeaserLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [changeLoading, setChangeLoading] = useState(false);
  const [designWishes, setDesignWishes] = useState('');
  const [changeRequest, setChangeRequest] = useState('');
  const [changes, setChanges] = useState([]);
  const [copied, setCopied] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpEmail, setFollowUpEmail] = useState('');
  const [followUpCopied, setFollowUpCopied] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const fetchLead = async () => {
    try {
      const res = await api.get(`/leads/${id}`);
      setLead(res.data);
      setDesignWishes(res.data.design_wishes || '');
      setStatusUpdate(res.data.status);
      setNotes(res.data.notes || '');
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
      toast.success('Teaser-Website wurde erfolgreich erstellt!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Fehler bei Teaser-Generierung');
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
      toast.success('Änderung wurde umgesetzt!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Fehler bei Änderung');
    } finally { setChangeLoading(false); }
  };

  const generateEmail = async () => {
    setEmailLoading(true);
    try {
      await api.post(`/leads/${id}/email`);
      await fetchLead();
      setTab('Email');
      toast.success('Email wurde erfolgreich generiert!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Fehler bei Email-Generierung');
    } finally { setEmailLoading(false); }
  };

  const regenerateEmail = async () => {
    setEmailLoading(true);
    try {
      await api.post(`/leads/${id}/email/regenerate`);
      await fetchLead();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Fehler');
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
      toast.error(err.response?.data?.message || 'Fehler beim Archivieren');
    }
  };

  const handleRestore = async () => {
    try {
      await api.post(`/leads/${id}/restore`);
      await fetchLead();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Fehler beim Wiederherstellen');
    }
  };

  const generateFollowUp = async () => {
    setFollowUpLoading(true);
    try {
      const res = await api.post(`/leads/${id}/follow-up`);
      setFollowUpEmail(res.data.emailText);
      await fetchLead();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Fehler bei Follow-up');
    } finally { setFollowUpLoading(false); }
  };

  const markContacted = async () => {
    try {
      await api.post(`/leads/${id}/mark-contacted`);
      await fetchLead();
    } catch {}
  };

  const saveNotes = async () => {
    setNotesSaving(true);
    try {
      await api.put(`/leads/${id}/notes`, { notes });
    } catch {}
    finally { setNotesSaving(false); }
  };

  const copyFollowUp = () => {
    navigator.clipboard.writeText(followUpEmail);
    setFollowUpCopied(true);
    setTimeout(() => setFollowUpCopied(false), 2000);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader className="w-6 h-6 animate-spin text-blue-500" /></div>;
  if (!lead) return null;

  const teaserUrl = lead.teaser_subdomain ? `https://${lead.teaser_subdomain}.webseiten-werkstatt.at` : null;

  return (
    <div className="p-6 max-w-5xl">
      <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white flex items-center gap-1 mb-4 text-sm">
        <ArrowLeft className="w-4 h-4" /> Zurück
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
            <option value="follow_up">Follow-up</option>
            <option value="responded">Gemeldet</option>
            <option value="no_interest">Kein Interesse</option>
            <option value="meeting">Termin</option>
            <option value="won">Gewonnen</option>
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
      {tab === 'Übersicht' && (
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

          {/* Mini-Audit */}
          {lead.analysis_raw?.audit && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h3 className="text-white font-medium mb-3">Website-Audit</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {Object.entries(lead.analysis_raw.audit).map(([key, val]) => (
                  <div key={key} className="bg-gray-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-300 text-xs font-medium capitalize">{key === 'seo' ? 'SEO' : key === 'inhalt' ? 'Inhalt' : key === 'rechtlich' ? 'Rechtlich' : key === 'usability' ? 'Usability' : key}</span>
                      <span className={`text-xs font-bold ${val.score >= 4 ? 'text-green-400' : val.score >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>{val.score}/5</span>
                    </div>
                    <div className="h-1.5 bg-gray-600 rounded-full mb-1.5">
                      <div className={`h-full rounded-full ${val.score >= 4 ? 'bg-green-500' : val.score >= 3 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${val.score * 20}%`}} />
                    </div>
                    <div className="text-gray-400 text-xs">{val.status}</div>
                  </div>
                ))}
              </div>
              {lead.analysis_raw.audit && Object.values(lead.analysis_raw.audit).some(v => v.details) && (
                <div className="space-y-2 mb-4">
                  {Object.entries(lead.analysis_raw.audit).map(([key, val]) => val.details ? (
                    <div key={key} className="text-sm">
                      <span className="text-gray-400 font-medium capitalize">{key === 'seo' ? 'SEO' : key}: </span>
                      <span className="text-gray-300">{val.details}</span>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          )}

          {lead.suggestions && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <h3 className="text-white font-medium mb-2">Verbesserungsvorschläge</h3>
              <p className="text-gray-300 text-sm whitespace-pre-line">{lead.suggestions}</p>
            </div>
          )}

          {/* Original Website Preview */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <span className="text-gray-400 text-sm">Aktuelle Website</span>
              <a href={lead.url} target="_blank" rel="noopener" className="text-blue-400 hover:underline text-xs flex items-center gap-1">
                Im neuen Tab öffnen <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <iframe
              src={`/api/leads/${lead.id}/original-preview?token=${localStorage.getItem('token')}`}
              className="w-full h-[450px] bg-white"
              title="Original Website"
              sandbox="allow-same-origin"
            />
          </div>

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
                placeholder="Design-Wünsche (optional)..."
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
                <iframe src={`/api/leads/${lead.id}/teaser/preview?token=${localStorage.getItem('token')}`} className="w-full h-[600px] bg-white" title="Teaser Preview" sandbox="allow-same-origin" />
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                <h3 className="text-white font-medium mb-2">Änderungswunsch</h3>
                <textarea value={changeRequest} onChange={e => setChangeRequest(e.target.value)} rows={3}
                  placeholder="Beschreibe deine Änderungswünsche..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-blue-500" />
                <button onClick={requestChange} disabled={changeLoading || !changeRequest.trim()}
                  className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                  {changeLoading ? <Loader className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {changeLoading ? 'Wird angepasst...' : 'Änderung anfordern'}
                </button>
              </div>

              {changes.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-3">Änderungshistorie</h3>
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

      {/* Follow-up Tab */}
      {tab === 'Follow-up' && (
        <div className="space-y-4">
          {/* Status-Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="text-gray-400 text-xs mb-1">Kontaktiert am</div>
              <div className="text-white font-medium">{lead.contacted_at ? new Date(lead.contacted_at).toLocaleDateString('de-AT') : 'Noch nicht'}</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="text-gray-400 text-xs mb-1">Follow-ups gesendet</div>
              <div className="text-white font-medium">{lead.follow_up_count || 0}</div>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <div className="text-gray-400 text-xs mb-1">Letztes Follow-up</div>
              <div className="text-white font-medium">{lead.follow_up_at ? new Date(lead.follow_up_at).toLocaleDateString('de-AT') : 'Keines'}</div>
            </div>
          </div>

          {/* Als kontaktiert markieren */}
          {!lead.contacted_at && (
            <button onClick={markContacted} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm">
              Als kontaktiert markieren
            </button>
          )}

          {/* Follow-up Email generieren */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3">Follow-up Email generieren</h3>
            <p className="text-gray-400 text-sm mb-3">
              {lead.follow_up_count === 0 ? 'Erste freundliche Erinnerung' :
               lead.follow_up_count === 1 ? 'Zweite Erinnerung — etwas direkter' :
               'Letzte Erinnerung — kurz und höflich'}
            </p>
            <button onClick={generateFollowUp} disabled={followUpLoading}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
              {followUpLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Follow-up #{(lead.follow_up_count || 0) + 1} generieren
            </button>
          </div>

          {/* Follow-up Email anzeigen */}
          {followUpEmail && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-white font-medium">Follow-up Email</h3>
                <button onClick={copyFollowUp}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm">
                  {followUpCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {followUpCopied ? 'Kopiert!' : 'Kopieren'}
                </button>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 text-gray-200 text-sm whitespace-pre-wrap leading-relaxed">
                {followUpEmail}
              </div>
            </div>
          )}

          {/* Notizen */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <h3 className="text-white font-medium mb-2">Notizen</h3>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
              placeholder="Notizen zum Lead (z.B. Gesprächsprotokoll, nächste Schritte...)"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none focus:border-blue-500" />
            <button onClick={saveNotes} disabled={notesSaving}
              className="bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm">
              {notesSaving ? 'Speichern...' : 'Notizen speichern'}
            </button>
          </div>
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
