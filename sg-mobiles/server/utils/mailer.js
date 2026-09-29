import nodemailer from 'nodemailer';

// Sends mail through SMTP when SMTP_HOST is configured; otherwise logs to the console
// so flows like password reset still work in development.
let transport;
function getTransport() {
  if (transport !== undefined) return transport;
  transport = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null;
  return transport;
}

export async function sendMail({ to, subject, html }) {
  const t = getTransport();
  if (!t) {
    console.log(`\n[mail:dev] To: ${to}\nSubject: ${subject}\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n`);
    return;
  }
  try {
    await t.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html });
  } catch (err) {
    // Email problems must never break checkout or status updates.
    console.error('Mail failed:', err.message);
  }
}

const h = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inr = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN');
const wrap = (store, body) => `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111827">
    <div style="background:#ff5a1f;color:#fff;padding:16px 20px;font-size:20px;font-weight:bold">${store}</div>
    <div style="padding:20px;border:1px solid #eee;border-top:0">${body}</div>
  </div>`;

export function orderPlacedMail(order, user, store = 'SG Mobiles') {
  const rows = order.items
    .map((i) => `<tr><td style="padding:6px 0">${h(i.name)}${i.variantName ? ` (${h(i.variantName)})` : ''} × ${i.qty}</td><td align="right">${inr(i.price * i.qty)}</td></tr>`)
    .join('');
  return {
    to: user.email,
    subject: `Order #${order.orderNo} confirmed`,
    html: wrap(store, `
      <p>Hi ${h(user.name)},</p>
      <p>Thanks for shopping with us! Your order <b>#${order.orderNo}</b> has been placed.</p>
      <table width="100%" style="border-collapse:collapse">${rows}
        <tr><td style="border-top:1px solid #eee;padding-top:8px"><b>Total</b></td><td align="right" style="border-top:1px solid #eee;padding-top:8px"><b>${inr(order.total)}</b></td></tr>
      </table>
      <p>Payment: ${order.paymentMethod}${order.isPaid ? ' (paid)' : ''}</p>`),
  };
}

export function statusMail(order, user, store = 'SG Mobiles') {
  const tracking = order.trackingId
    ? `<p>Courier: <b>${h(order.courier || '-')}</b><br>Tracking ID: <b>${h(order.trackingId)}</b>${order.trackingUrl ? `<br><a href="${h(order.trackingUrl)}">Track your parcel</a>` : ''}</p>`
    : '';
  return {
    to: user.email,
    subject: `Order #${order.orderNo} is ${order.status}`,
    html: wrap(store, `<p>Hi ${h(user.name)},</p><p>Your order <b>#${order.orderNo}</b> is now <b>${order.status}</b>.</p>${tracking}`),
  };
}

export function resetMail(user, link, store = 'SG Mobiles') {
  return {
    to: user.email,
    subject: 'Reset your password',
    html: wrap(store, `<p>Hi ${h(user.name)},</p><p>Click the link below to set a new password. It expires in 30 minutes.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, ignore this email.</p>`),
  };
}
