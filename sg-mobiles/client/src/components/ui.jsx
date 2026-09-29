import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaRegStar, FaStarHalfAlt } from 'react-icons/fa';
import { inr, effectivePrice, discountPct } from '../api';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#f1f2f4"/><text x="200" y="215" font-family="Arial" font-size="34" font-weight="700" fill="#c7cbd1" text-anchor="middle">SG Mobiles</text></svg>'
  );

export function Img({ src, alt = '', ...rest }) {
  return (
    <img
      src={src || FALLBACK}
      alt={alt}
      loading="lazy"
      onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
      {...rest}
    />
  );
}

// Adds the `in` class once the element scrolls into view (CSS handles the animation).
export function Reveal({ as: Tag = 'div', className = '', variant = '', delay = 0, style, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return setShown(true);
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={`reveal ${variant} ${shown ? 'in' : ''} ${className}`}
      // Drop the stagger delay once revealed so hover transitions stay instant.
      style={done ? style : { ...style, transitionDelay: `${delay}ms` }}
      onTransitionEnd={() => shown && setDone(true)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Stars({ value = 0, count }) {
  const stars = [1, 2, 3, 4, 5].map((i) =>
    value >= i ? <FaStar key={i} /> : value >= i - 0.5 ? <FaStarHalfAlt key={i} /> : <FaRegStar key={i} />
  );
  return (
    <span className="stars" aria-label={`Rated ${value} out of 5`}>
      {stars}
      {count !== undefined && <span className="n">({count})</span>}
    </span>
  );
}

export function Price({ product }) {
  const off = discountPct(product);
  return (
    <div className="price">
      <span className="now">{inr(effectivePrice(product))}</span>
      {off > 0 && <del>{inr(product.price)}</del>}
      {off > 0 && <span className="off">{off}% off</span>}
    </div>
  );
}

export function Qty({ value, onChange, max = 99, large }) {
  return (
    <div className={`qty ${large ? 'lg' : ''}`}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Decrease">−</button>
      <span>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label="Increase">+</button>
    </div>
  );
}

// Counts down to the end of the current day (a rolling "today's deal" timer).
export function Countdown() {
  const calc = () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
    return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div className="countdown">
      <div><b>{pad(t.h)}</b><small>Hours</small></div>
      <div><b>{pad(t.m)}</b><small>Mins</small></div>
      <div><b>{pad(t.s)}</b><small>Secs</small></div>
    </div>
  );
}

// `crumbs` entries are strings or [label, link] pairs.
export function PageHead({ title, crumbs = [], image, description }) {
  return (
    <div
      className={`page-head ${image ? 'has-banner' : ''}`}
      style={image ? { backgroundImage: `linear-gradient(100deg, rgba(11,31,58,.92), rgba(11,31,58,.55)), url("${image}")` } : undefined}
    >
      <div className="container">
        <h1>{title}</h1>
        {description && <p className="page-desc">{description}</p>}
        <div className="crumbs">
          <Link to="/">Home</Link>
          {crumbs.map((c) => {
            const [label, to] = Array.isArray(c) ? c : [c];
            return <span key={label}>/ {to ? <Link to={to}>{label}</Link> : label}</span>;
          })}
        </div>
      </div>
    </div>
  );
}
