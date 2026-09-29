import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FiArrowUp } from 'react-icons/fi';
import Header from './Header';
import Footer from './Footer';
import CartDrawer from './CartDrawer';
import WhatsAppButton from './WhatsAppButton';

function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button className={`back-top ${show ? 'show' : ''}`} onClick={() => window.scrollTo({ top: 0 })} aria-label="Back to top">
      <FiArrowUp />
    </button>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  // Braces matter: newer Chrome returns a Promise from scrollTo, which React would treat as a cleanup.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <>
      <Header />
      {/* keyed by path so each page replays the fade-in transition */}
      <main key={pathname} className="page-fade">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
      <BackToTop />
    </>
  );
}
