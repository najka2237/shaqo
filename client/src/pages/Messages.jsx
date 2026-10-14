import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';

export default function Messages() {
  const { appId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const end = useRef(null);
  const load = () => api.get(`/messages/application/${appId}`).then((d) => { setData(d); window.dispatchEvent(new Event('notif-changed')); }).catch((e) => setErr(e.message));
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); /* eslint-disable-next-line */ }, [appId]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.messages?.length]);
  const send = async (e) => {
    e.preventDefault(); if (!text.trim()) return; setErr('');
    try { await api.post(`/messages/application/${appId}`, { text }); setText(''); load(); }
    catch (x) { setErr(x.message); }
  };
  if (err && !data) return <p className="alert error">{err}</p>;
  if (!data) return <p className="muted center">Loading…</p>;
  return (
    <>
      <Link to={data.backTo} className="muted">← Back</Link>
      <h2>Messages: {data.application.jobTitle}</h2>
      <p className="muted">Conversation about the application of {data.application.applicantName}</p>
      <div className="card chat">
        {data.messages.length === 0 && <p className="muted center">No messages yet. Say hello below.</p>}
        {data.messages.map((m) => (
          <div key={m._id} className={'bubble ' + (m.sender?._id === user._id ? 'me' : 'them')}>
            <small className="muted">{m.sender?.name} · {new Date(m.createdAt).toLocaleString()}</small>
            <p className="pre">{m.text}</p>
          </div>
        ))}
        <div ref={end} />
      </div>
      {err && <p className="alert error">{err}</p>}
      <form className="row gap" onSubmit={send}>
        <input placeholder="Write a message…" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn">Send</button>
      </form>
    </>
  );
}
