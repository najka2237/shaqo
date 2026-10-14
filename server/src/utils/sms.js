import { config } from '../config.js';

function normalizePhone(p) {
  const d = String(p || '').replace(/[^\d+]/g, '');
  if (!d) return null;
  if (d.startsWith('+')) return d;
  if (d.startsWith('00')) return '+' + d.slice(2);
  return d.length >= 9 ? '+' + d : null;
}

/** Send an SMS (or WhatsApp message) through Twilio. Never throws. No-op if Twilio is not configured. */
export async function sendSms(phone, text, { whatsapp = false } = {}) {
  const { sid, token, smsFrom, whatsappFrom } = config.twilio;
  const from = whatsapp ? whatsappFrom : smsFrom;
  const to = normalizePhone(phone);
  if (!sid || !token || !from || !to) return false;
  try {
    const wa = (n) => (String(n).startsWith('whatsapp:') ? n : `whatsapp:${n}`);
    const body = new URLSearchParams({ To: whatsapp ? wa(to) : to, From: whatsapp ? wa(from) : from, Body: text });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!res.ok) {
      console.error('SMS/WhatsApp failed:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('SMS/WhatsApp failed:', err.message);
    return false;
  }
}
