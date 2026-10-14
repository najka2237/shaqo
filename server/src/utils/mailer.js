import { config } from '../config.js';

let transport;
let tried = false;

async function getTransport() {
  if (!config.smtp.host) return null;
  if (tried) return transport;
  tried = true;
  try {
    const { default: nodemailer } = await import('nodemailer');
    transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  } catch {
    console.error('SMTP_HOST is set but "nodemailer" is not installed. Run: npm install');
    transport = null;
  }
  return transport;
}

/**
 * Send an email. Never throws. Returns true when it was handed to the SMTP server.
 * Without SMTP settings nothing is sent; with { devLog: true } the message is printed
 * to the server terminal so you can still test flows such as "forgot password".
 */
export async function sendEmail(to, subject, text, { devLog = false } = {}) {
  try {
    const t = await getTransport();
    if (!t) {
      if (devLog && config.nodeEnv !== 'production') {
        console.log(`\n[email not configured - printed here instead]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
      }
      return false;
    }
    await t.sendMail({ from: config.smtp.from, to, subject, text });
    return true;
  } catch (err) {
    console.error('Email failed:', err.message);
    return false;
  }
}
