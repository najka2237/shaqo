import { useLang } from '../i18n.jsx';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function Notifications() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const nav = useNavigate();
  const load = () => api.get('/notifications').then(setData);
  useEffect(() => { load(); }, []);
  const changed = () => window.dispatchEvent(new Event('notif-changed'));
  const open = async (n) => { if (!n.read) { await api.patch(`/notifications/${n._id}/read`); changed(); } if (n.link) nav(n.link); else load(); };
  const readAll = async () => { await api.patch('/notifications/read-all'); changed(); load(); };
  if (!data) return <p className="muted center">{t('Loading…')}</p>;
  return (
    <>
      <div className="row between"><h2>{t('Notifications')}</h2>{data.unread > 0 && <button className="btn small outline" onClick={readAll}>{t('Mark all as read')}</button>}</div>
      {data.notifications.length === 0 && <div className="empty"><h3>{t('No notifications yet')}</h3></div>}
      <div className="list">{data.notifications.map((n) => (
        <button key={n._id} className={'card notif ' + (n.read ? '' : 'unread')} onClick={() => open(n)}>
          <span>{n.message}</span><small className="muted">{new Date(n.createdAt).toLocaleString()}</small>
        </button>
      ))}</div>
    </>
  );
}
