import { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Trash2, Edit2, X, Save, Loader } from 'lucide-react';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'editor' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    const res = await api.get('/users');
    setUsers(res.data);
  };

  useEffect(() => { fetchUsers(); }, []);

  const resetForm = () => {
    setForm({ username: '', email: '', password: '', role: 'editor' });
    setShowForm(false);
    setEditId(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editId) {
        const data = { username: form.username, email: form.email, role: form.role };
        if (form.password) data.password = form.password;
        await api.put(`/users/${editId}`, data);
      } else {
        await api.post('/users', form);
      }
      await fetchUsers();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Fehler');
    } finally { setLoading(false); }
  };

  const startEdit = (user) => {
    setForm({ username: user.username, email: user.email, password: '', role: user.role });
    setEditId(user.id);
    setShowForm(true);
  };

  const deleteUser = async (id) => {
    if (!confirm('Benutzer wirklich löschen?')) return;
    try {
      await api.delete(`/users/${id}`);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Fehler');
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Benutzerverwaltung</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Neuer Benutzer
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-medium">{editId ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}</h3>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input type="text" placeholder="Benutzername" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            <input type="password" placeholder={editId ? 'Neues Passwort (leer lassen)' : 'Passwort'} value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} {...(!editId && { required: true })}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editId ? 'Speichern' : 'Erstellen'}
          </button>
        </form>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-3 text-left text-gray-400">Benutzername</th>
              <th className="p-3 text-left text-gray-400">Email</th>
              <th className="p-3 text-left text-gray-400">Rolle</th>
              <th className="p-3 text-left text-gray-400">Erstellt</th>
              <th className="p-3 text-right text-gray-400">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-700/50">
                <td className="p-3 text-white">{u.username}</td>
                <td className="p-3 text-gray-300">{u.email}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{u.role}</span></td>
                <td className="p-3 text-gray-400">{new Date(u.created_at).toLocaleDateString('de-AT')}</td>
                <td className="p-3 text-right">
                  <button onClick={() => startEdit(u)} className="text-gray-400 hover:text-blue-400 mr-2"><Edit2 className="w-4 h-4 inline" /></button>
                  <button onClick={() => deleteUser(u.id)} className="text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4 inline" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
