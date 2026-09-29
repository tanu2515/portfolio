import { useState } from 'react';
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend } from 'react-icons/fi';
import { api } from '../api';
import { useShop } from '../context/ShopContext';
import { useToast } from '../context/ToastContext';
import { PageHead, Reveal } from '../components/ui';
import { useTitle } from '../components/lib';

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '' };

export default function Contact() {
  const { settings } = useShop();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  useTitle('Contact Us');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/contact', { method: 'POST', body: form });
      setForm(EMPTY);
      toast("Message sent! We'll get back to you soon.");
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }), className: 'input' });
  const cards = [
    [FiMapPin, 'Visit Us', settings.address],
    [FiPhone, 'Call Us', settings.phone],
    [FiMail, 'Email Us', settings.email],
    [FiClock, 'Working Hours', 'Mon – Sat: 10:00 AM – 9:00 PM'],
  ].filter(([, , v]) => v);

  return (
    <>
      <PageHead title="Contact Us" crumbs={['Contact']} />
      <div className="container contact-grid">
        <div>
          <h2>Get in touch</h2>
          <p className="muted">Questions about a product or your order? We're happy to help.</p>
          {cards.map(([Icon, title, value], i) => (
            <Reveal key={title} className="contact-card" variant="from-left" delay={i * 100}>
              <span className="ic"><Icon /></span>
              <div><b>{title}</b><p>{value}</p></div>
            </Reveal>
          ))}
        </div>
        <Reveal as="form" className="box" onSubmit={submit} variant="from-right">
          <h3>Send us a message</h3>
          <div className="grid-2">
            <div className="field"><label>Name *</label><input required {...f('name')} /></div>
            <div className="field"><label>Email *</label><input type="email" required {...f('email')} /></div>
            <div className="field"><label>Phone</label><input type="tel" {...f('phone')} /></div>
            <div className="field"><label>Subject</label><input {...f('subject')} /></div>
          </div>
          <div className="field"><label>Message *</label><textarea required rows={6} {...f('message')} /></div>
          <button className="btn" disabled={busy}><FiSend /> {busy ? 'Sending…' : 'Send Message'}</button>
        </Reveal>
      </div>
    </>
  );
}
