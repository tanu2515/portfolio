import { useParams } from 'react-router-dom';
import { PageHead } from '../components/ui';
import { useShop } from '../context/ShopContext';
import NotFound from './NotFound';
import { useTitle } from '../components/lib';

// Static policy pages. Edit the copy here to match your business.
const PAGES = {
  'refund-policy': {
    title: 'Refund & Returns Policy',
    body: [
      ['Replacement window', 'Products can be returned or replaced within 7 days of delivery if they are damaged, defective or different from what was ordered.'],
      ['Conditions', 'Items must be unused, in original packaging with all accessories, invoice and tags. Screen guards, lamination and opened hygiene products (earbuds) are only replaceable if defective.'],
      ['How to request', 'Contact us with your order number and photos/video of the issue. Once approved, we arrange a pickup or ask you to ship it back.'],
      ['Refunds', 'Refunds are processed within 5–7 working days after the returned item passes inspection. COD orders are refunded via UPI or bank transfer.'],
    ],
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    body: [
      ['What we collect', 'Your name, email, phone number and shipping address when you register or place an order.'],
      ['How we use it', 'Only to process orders, deliver products, provide support and (if you opt in) send offers. We never sell your data.'],
      ['Security', 'Passwords are stored encrypted. Payments made on delivery are handled directly with our delivery partner.'],
      ['Your rights', 'You can update your details from My Account or ask us to delete your account at any time.'],
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    body: [
      ['General', 'By using this website you agree to these terms. Prices and availability may change without notice.'],
      ['Orders', 'We may cancel an order in case of pricing errors, stock issues or suspected fraud; any payment made will be refunded in full.'],
      ['Warranty', 'Brand warranty applies as per the manufacturer. Our 7-day replacement covers manufacturing defects only.'],
      ['Liability', 'Our liability is limited to the value of the product purchased.'],
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    body: [
      ['Product images', 'Images are for illustration; actual colour and design may vary slightly.'],
      ['Trademarks', 'Brand names and logos belong to their respective owners and are used only to identify compatible products.'],
    ],
  },
  faq: {
    title: 'Frequently Asked Questions',
    faq: [
      ['How long does delivery take?', 'Usually 2–5 working days depending on your location.'],
      ['Is shipping free?', 'Yes, on all orders above the free-shipping amount shown at the top of the site.'],
      ['Do you offer Cash on Delivery?', 'Yes, COD and UPI-on-delivery are available on all orders.'],
      ['How do I track my order?', 'Use the Track Order page with your order number and phone, or check My Account → Orders.'],
      ['Are the products original?', 'We sell genuine branded products and quality-checked accessories with replacement warranty.'],
      ['Can I cancel my order?', 'Yes, from My Account → Orders while the order is Pending or Processing.'],
    ],
  },
};

// Built from live store settings so it always matches checkout rules.
function shippingPolicy(s) {
  const pins = (s.serviceablePincodes || '').split(/[\s,]+/).filter(Boolean);
  return {
    title: 'Shipping & Delivery Policy',
    body: [
      ['Delivery time', `Orders are usually delivered within ${s.deliveryDaysMin}–${s.deliveryDaysMax} working days (Sundays excluded). You can check the exact estimate for your pincode on any product page or at checkout.`],
      ['Shipping charges', s.freeShippingOver
        ? `Shipping is FREE on orders of ₹${s.freeShippingOver} or more. Orders below that are charged a flat ₹${s.shippingFee}.`
        : `A flat shipping fee of ₹${s.shippingFee} applies to every order.`],
      ['Cash / UPI on delivery', s.codEnabled
        ? `Pay on delivery is available${s.codMaxOrder ? ` for orders up to ₹${s.codMaxOrder}` : ''}${s.codCharge ? ` with a ₹${s.codCharge} handling fee` : ' at no extra cost'}.${s.onlinePayment ? ' You can also pay online by UPI, card or netbanking.' : ''}`
        : 'Pay on delivery is currently unavailable; please pay online at checkout.'],
      ['Where we deliver', pins.length
        ? 'We currently deliver to selected pincodes only. Enter your pincode on a product page to confirm availability.'
        : 'We deliver across India through trusted courier partners.'],
      ['Order tracking', 'Once your order ships you will receive the courier name and tracking ID by email. You can also follow it from My Account → Orders or the Track Order page.'],
      ['Damaged parcel', `If the package looks tampered with or damaged, please refuse delivery or contact us within 24 hours. Returns and replacements are accepted within ${s.returnDays} days of delivery.`],
    ],
  };
}

export default function InfoPage() {
  const { slug } = useParams();
  const { settings } = useShop();
  const page = slug === 'shipping-policy' ? shippingPolicy(settings) : PAGES[slug];
  useTitle(page?.title || 'Page Not Found');
  if (!page) return <NotFound />;
  return (
    <>
      <PageHead title={page.title} crumbs={[page.title]} />
      <div className="prose">
        {page.body?.map(([h, p]) => (
          <section key={h}><h2>{h}</h2><p>{p}</p></section>
        ))}
        {page.faq && (
          <div className="faq">
            {page.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        )}
        <p className="muted" style={{ marginTop: 30 }}>
          Questions? Contact {settings.storeName} at {settings.email || 'our support team'}{settings.phone ? ` or ${settings.phone}` : ''}.
        </p>
      </div>
    </>
  );
}
