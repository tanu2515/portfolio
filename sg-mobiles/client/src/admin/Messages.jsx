import { useEffect, useState } from 'react';
import { FiTrash2, FiMail, FiPhone, FiChevronDown } from 'react-icons/fi';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import { Empty, fmtDate } from './common';

export default function Messages() {
  const toast = useToast();
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api('/admin/messages').then(setList).catch((e) => toast(e.message, 'error'));
  }, [toast]);

  const setRead = async (m, read) => {
    try {
      await api(`/admin/messages/${m._id}`, { method: 'PUT', body: { read } });
      setList((l) => l.map((x) => (x._id === m._id ? { ...x, read } : x)));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const expand = (m) => {
    setOpen(open === m._id ? null : m._id);
    if (!m.read) setRead(m, true);
  };

  const del = async (m) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api(`/admin/messages/${m._id}`, { method: 'DELETE' });
      setList((l) => l.filter((x) => x._id !== m._id));
      toast('Message deleted');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  if (!list) return <Loader />;
  const shown = filter === 'unread' ? list.filter((m) => !m.read) : list;
  const unread = list.filter((m) => !m.read).length;

  return (
    <div className="ad-stack">
      <div className="ad-toolbar">
        <div className="ad-tabs">
          <button className={`ad-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All ({list.length})</button>
          <button className={`ad-tab ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>Unread ({unread})</button>
        </div>
      </div>
      <section className="ad-card ad-card-flush">
        {shown.length === 0 ? <Empty>No messages.</Empty> : (
          <ul className="ad-messages">
            {shown.map((m) => (
              <li key={m._id} className={`ad-msg ${m.read ? '' : 'ad-msg-unread'} ${open === m._id ? 'ad-msg-open' : ''}`}>
                <button className="ad-msg-head" onClick={() => expand(m)}>
                  {!m.read && <span className="ad-dot" />}
                  <div className="ad-msg-summary">
                    <strong>{m.name}</strong>
                    <span className="ad-msg-subject">{m.subject || m.message.slice(0, 80)}</span>
                  </div>
                  <span className="ad-muted ad-small ad-nowrap">{fmtDate(m.createdAt, true)}</span>
                  <FiChevronDown className="ad-msg-chevron" />
                </button>
                <div className="ad-msg-body">
                  <div className="ad-msg-inner">
                    <div className="ad-msg-contact">
                      <a href={`mailto:${m.email}`} className="ad-link"><FiMail /> {m.email}</a>
                      {m.phone && <a href={`tel:${m.phone}`} className="ad-link"><FiPhone /> {m.phone}</a>}
                    </div>
                    {m.subject && <p className="ad-strong">{m.subject}</p>}
                    <p className="ad-msg-text">{m.message}</p>
                    <div className="ad-row">
                      <a className="ad-btn ad-btn-primary ad-btn-sm" href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || 'Your enquiry')}`}>Reply</a>
                      <button className="ad-btn ad-btn-ghost ad-btn-sm" onClick={() => setRead(m, !m.read)}>Mark as {m.read ? 'unread' : 'read'}</button>
                      <button className="ad-btn ad-btn-ghost ad-btn-sm ad-danger ad-ml-auto" onClick={() => del(m)}><FiTrash2 /> Delete</button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
