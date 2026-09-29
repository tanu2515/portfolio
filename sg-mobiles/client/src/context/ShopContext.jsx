import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const ShopCtx = createContext(null);

const DEFAULT_SETTINGS = {
  storeName: 'SG Mobiles', topbarText: 'Free Shipping On All Orders Over ₹500',
  phone: '', email: '', address: '', freeShippingOver: 500, shippingFee: 50, social: {},
  whatsapp: '', gstin: '', deliveryDaysMin: 2, deliveryDaysMax: 5, codEnabled: true, codCharge: 0,
  codMaxOrder: 0, returnDays: 7, onlinePayment: false,
};

// Site-wide data shared by header, footer and checkout: settings + category tree.
export function ShopProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState([]);

  const refresh = useCallback(() => {
    api('/settings').then(setSettings).catch(() => {});
    api('/categories').then(setCategories).catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);

  const tree = useMemo(() => {
    const top = categories.filter((c) => !c.parent);
    return top.map((c) => ({ ...c, children: categories.filter((x) => x.parent === c._id) }));
  }, [categories]);

  return (
    <ShopCtx.Provider value={{ settings, categories, tree, refresh }}>
      {children}
    </ShopCtx.Provider>
  );
}

export const useShop = () => useContext(ShopCtx);
