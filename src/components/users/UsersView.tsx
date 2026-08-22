import React, { useState, useEffect } from 'react';
import { Users, Plus, ShieldCheck, Trash2, Key } from 'lucide-react';
import { User, UserRole } from '../../types/index';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';

export const UsersView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('technician');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to load user accounts.');
      }
      setUsers(await res.json());
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !fullName || password.length < 8) {
      setError('Complete all fields and choose a temporary password with at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, fullName, role, password })
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Unable to create the user account.'); }
      await fetchUsers();
      setIsModalOpen(false);
      setUsername('');
      setEmail('');
      setFullName('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create the user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Deactivate this user account? Their login sessions will be ended, but the audit history will be preserved.')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'Unable to deactivate the user account.'); }
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to deactivate the user account.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">User Accounts & Role Permissions</h2>
          <p className="text-xs text-slate-500">Super Admins, IT Administrators, Technicians, Department Heads, and Viewers.</p>
        </div>
        {currentUser?.role === 'super_admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Create User Account</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {error && <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</div>}
        {loading && <div className="p-8 text-center text-xs text-slate-500">Loading user accounts…</div>}
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
            <tr>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Username</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Created Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!loading && users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No user accounts are available for this organization.</td></tr>
            )}
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {u.fullName.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-900">{u.fullName}</span>
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-slate-700">{u.username}</td>
                <td className="py-3 px-4 text-slate-600">{u.email}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    u.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                    u.role === 'it_admin' ? 'bg-indigo-100 text-indigo-800' :
                    u.role === 'technician' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {u.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="py-3 px-4 text-right">
                  {currentUser?.role === 'super_admin' && u.id !== 'user-superadmin-01' && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      title="Delete user"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New User Account"
        subtitle="Assign role-based permissions."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Jordan Lee"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. jlee"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. jlee@system.local"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              >
                <option value="technician">Technician</option>
                <option value="it_admin">IT Administrator</option>
                <option value="department_head">Department Head</option>
                <option value="viewer">Viewer (Read-only)</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
