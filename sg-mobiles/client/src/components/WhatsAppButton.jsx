import { FaWhatsapp } from 'react-icons/fa';
import { useShop } from '../context/ShopContext';
import { waLink } from './lib';

export default function WhatsAppButton() {
  const { settings } = useShop();
  if (!settings.whatsapp) return null;
  return (
    <a
      className="wa-btn"
      href={waLink(settings.whatsapp, `Hi ${settings.storeName}, I have a question.`)}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <FaWhatsapp />
    </a>
  );
}
