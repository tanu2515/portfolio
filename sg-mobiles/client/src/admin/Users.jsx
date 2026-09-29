import { useEffect, useMemo, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { api, inr } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import { Empty, fmtDate } from './common';

export default function Users() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    api('/admin/users').then(setUsers).catch((e) => toast(e.message, 'error'));
  }, [toast]);

  const shown = useMemo(() => {
    if (!users) return [];
    const s = q.trim().toLowerCase();
    return s ? users.filter((u) => `${u.name} ${u.email} ${u.phone || ''}`.toLowerCase().includes(s)) : users;
  }, [users, q]);

  const update = async (u, body) => {
    if (body.blocked === true && !window.confirm(`Block ${u.name}? They won't be able to log in.`)) return;
    try {
      const d = await api(`/admin/users/${u._id}`, { method: 'PUT', body: { role: u.role, blocked: u.blocked, ...body } });
      setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, role: d.role, blocked: d.blocked } : x)));
      toast('User updated');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="ad-stack">
      <div className="ad-toolbar">
        <div className="ad-search">
          <FiSearch />
          <input placeholder="Search name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {users && <span className="ad-muted ad-ml-auto">{users.length} accounts</span>}
      </div>

      <section className="ad-card ad-card-flush">
        {!users ? <Loader /> : shown.length === 0 ? <Empty>No users found.</Empty> : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr><th>User</th><th>Phone</th><th>Joined</th><th>Orders</th><th>Spent</th><th>Role</th><th>Status</th></tr>
              </thead>
              <tbody>
                {shown.map((u) => {
                  const self = u._id === me?._id;
                  return (
                    <tr key={u._id}>
                      <td>
                        <div className="ad-user-cell">
                          <span className="ad-avatar ad-avatar-sm">{u.name?.[0]?.toUpperCase()}</span>
                          <div>
                            <div className="ad-strong">{u.name} {self && <span className="ad-tag">you</span>}</div>
                            <div className="ad-muted ad-small">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{u.phone || '—'}</td>
                      <td className="ad-nowrap">{fmtDate(u.createdAt)}</td>
                      <td>{u.orders}</td>
                      <td>{inr(u.spent)}</td>
                      <td>
                        <select className="ad-input ad-select-sm" value={u.role} disabled={self} onChange={(e) => update(u, { role: e.target.value })}>
                          <option value="user">Customer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        {self ? <span className="ad-pill ad-pill-green">Active</span> : (
                          <button
                            className={`ad-pill ad-pill-btn ${u.blocked ? 'ad-pill-red' : 'ad-pill-green'}`}
                            onClick={() => update(u, { blocked: !u.blocked })}
                            title={u.blocked ? 'Click to unblock' : 'Click to block'}
                          >
                            {u.blocked ? 'Blocked' : 'Active'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
