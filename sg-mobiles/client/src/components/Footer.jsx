import { Link } from 'react-router-dom';
import { FiMapPin, FiPhone, FiMail } from 'react-icons/fi';
import { FaFacebookF, FaInstagram, FaTwitter, FaYoutube } from 'react-icons/fa';
import { useShop } from '../context/ShopContext';
import { Logo } from './Header';

export default function Footer() {
  const { settings, tree } = useShop();
  const s = settings.social || {};
  const socials = [
    [s.facebook, FaFacebookF, 'Facebook'],
    [s.instagram, FaInstagram, 'Instagram'],
    [s.twitter, FaTwitter, 'Twitter'],
    [s.youtube, FaYoutube, 'YouTube'],
  ];

  return (
    <footer className="footer">
      <div className="container footer-top">
        <div>
          <Logo />
          <p>Your trusted destination for genuine mobile accessories, smart watches, earbuds and gadgets at the best prices.</p>
          {settings.address && <div className="contact-line"><FiMapPin /> {settings.address}</div>}
          {settings.phone && <div className="contact-line"><FiPhone /> <a href={`tel:${settings.phone}`}>{settings.phone}</a></div>}
          {settings.email && <div className="contact-line"><FiMail /> <a href={`mailto:${settings.email}`}>{settings.email}</a></div>}
        </div>
        <div>
          <h4>Categories</h4>
          <ul>
            {tree.slice(0, 7).map((c) => <li key={c._id}><Link to={`/shop?category=${c.slug}`}>{c.name}</Link></li>)}
          </ul>
        </div>
        <div>
          <h4>Orders & Support</h4>
          <ul>
            <li><Link to="/account?tab=orders">My Orders</Link></li>
            <li><Link to="/track-order">Track Order</Link></li>
            <li><Link to="/page/shipping-policy">Shipping & Delivery</Link></li>
            <li><Link to="/page/refund-policy">Returns & Refund Policy</Link></li>
            <li><Link to="/page/privacy-policy">Privacy Policy</Link></li>
            <li><Link to="/page/terms">Terms & Conditions</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
          </ul>
        </div>
        <div>
          <h4>Follow Us</h4>
          <p>Get the latest deals and launches first.</p>
          <div className="socials">
            {socials.map(([href, Icon, label]) => (
              <a key={label} href={href || '#'} target={href ? '_blank' : undefined} rel="noreferrer" aria-label={label}><Icon /></a>
            ))}
          </div>
          <h4 style={{ marginTop: 26 }}>We Accept</h4>
          <div className="pay-icons"><span>VISA</span><span>MasterCard</span><span>RuPay</span><span>UPI</span><span>COD</span></div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <span>{settings.storeName} Accessories. © {new Date().getFullYear()}. All Rights Reserved.</span>
          <nav>
            <Link to="/page/terms">Terms and conditions</Link>
            <Link to="/page/disclaimer">Disclaimer</Link>
            <Link to="/page/privacy-policy">Privacy Policy</Link>
            <Link to="/page/refund-policy">Refund and Returns Policy</Link>
            <Link to="/page/faq">FAQ</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
