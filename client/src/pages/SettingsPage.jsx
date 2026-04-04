import { useState, useEffect } from 'react';
import api from '../services/api';
import { Save, Loader, Key, Bot, Globe } from 'lucide-react';

const SETTINGS_CONFIG = [
  { key: 'anthropic_api_key', label: 'Anthropic API Key', icon: Key, type: 'password', encrypted: true },
  { key: 'openai_api_key', label: 'OpenAI API Key (GPT-5)', icon: Key, type: 'password', encrypted: true },
  { key: 'google_places_api_key', label: 'Google Places API Key', icon: Key, type: 'password', encrypted: true },
  { key: 'default_ai_model', label: 'AI Modell (Anthropic)', icon: Bot, type: 'text', encrypted: false },
  { key: 'teaser_domain', label: 'Teaser Domain', icon: Globe, type: 'text', encrypted: false },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState({});
  const [message, setMessage] = useState({});

  useEffect(() => {
    api.get('/settings').then(res => {
      const map = {};
      res.data.forEach(s => { map[s.key] = s.value; });
      setSettings(map);
    });
  }, []);

  const save = async (key) => {
    const value = values[key];
    if (value === undefined || value === '') return;
    setSaving(p => ({ ...p, [key]: true }));
    try {
      await api.put(`/settings/${key}`, { value });
      setMessage(p => ({ ...p, [key]: 'Gespeichert!' }));
      setValues(p => ({ ...p, [key]: undefined }));
      const res = await api.get('/settings');
      const map = {};
      res.data.forEach(s => { map[s.key] = s.value; });
      setSettings(map);
      setTimeout(() => setMessage(p => ({ ...p, [key]: '' })), 2000);
    } catch (err) {
      setMessage(p => ({ ...p, [key]: err.response?.data?.message || 'Fehler' }));
    } finally {
      setSaving(p => ({ ...p, [key]: false }));
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-6">Einstellungen</h1>

      <div className="space-y-4">
        {SETTINGS_CONFIG.map(({ key, label, icon: Icon, type }) => (
          <div key={key} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <label className="flex items-center gap-2 text-gray-300 text-sm mb-2">
              <Icon className="w-4 h-4" /> {label}
            </label>
            <div className="flex gap-2">
              <input
                type={type}
                placeholder={settings[key] || 'Nicht gesetzt'}
                value={values[key] !== undefined ? values[key] : ''}
                onChange={(e) => setValues(p => ({ ...p, [key]: e.target.value }))}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <button onClick={() => save(key)} disabled={saving[key] || values[key] === undefined}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm">
                {saving[key] ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
            </div>
            {message[key] && <p className="text-green-400 text-xs mt-1">{message[key]}</p>}
            {settings[key] && <p className="text-gray-500 text-xs mt-1">Aktuell: {settings[key]}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
