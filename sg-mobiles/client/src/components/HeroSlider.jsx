import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiArrowRight } from 'react-icons/fi';
import { Img } from './ui';

const DELAY = 6000;

export default function HeroSlider({ slides }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;

  const go = useCallback((to) => setI(((to % n) + n) % n), [n]);

  useEffect(() => {
    if (paused || n < 2) return;
    const id = setTimeout(() => go(i + 1), DELAY);
    return () => clearTimeout(id);
  }, [i, paused, n, go]);

  // Basic swipe support on touch screens.
  const [touchX, setTouchX] = useState(null);
  const onTouchEnd = (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
    setTouchX(null);
  };

  if (!n) return <div className="hero skeleton" style={{ borderRadius: 0 }} />;

  return (
    <section
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
    >
      {slides.map((s, idx) => (
        <div key={s._id} className={`slide ${idx === i ? 'active' : ''}`} aria-hidden={idx !== i}>
          <div className="slide-bg" style={{ background: `linear-gradient(120deg, ${s.bgColor}, #000000cc)` }} />
          <div className="container">
            <div className="slide-text">
              {s.kicker && <span className="slide-kicker">{renderKicker(s.kicker)}</span>}
              <h1>{s.title}</h1>
              {s.subtitle && <p>{s.subtitle}</p>}
              <div>
                <Link to={s.link || '/shop'} className="btn" tabIndex={idx === i ? 0 : -1}>
                  {s.buttonText || 'Shop Now'} <FiArrowRight />
                </Link>
              </div>
            </div>
            <div className="slide-img">
              <span className="ring" />
              <Img src={s.image} alt="" />
            </div>
          </div>
        </div>
      ))}

      {n > 1 && (
        <>
          <button className="hero-arrow prev" onClick={() => go(i - 1)} aria-label="Previous slide"><FiChevronLeft /></button>
          <button className="hero-arrow next" onClick={() => go(i + 1)} aria-label="Next slide"><FiChevronRight /></button>
          <div className="hero-dots">
            {slides.map((s, idx) => (
              <button key={s._id} className={idx === i ? 'active' : ''} onClick={() => go(idx)} aria-label={`Slide ${idx + 1}`} />
            ))}
          </div>
          {!paused && <span key={i} className="hero-progress" style={{ animationDuration: `${DELAY}ms` }} />}
        </>
      )}
    </section>
  );
}

// Highlights the part after "CODE:" e.g. "USE CODE: SALE35".
function renderKicker(text) {
  const m = text.match(/^(.*CODE:\s*)(.+)$/i);
  return m ? <>{m[1]}<b>{m[2]}</b></> : text;
}
