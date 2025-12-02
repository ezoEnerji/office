import { Currency } from '../types';
import { MARKET_RATES } from '../data/constants';

export const getCrossRate = (from: Currency, to: Currency): number => {
  if (from === to) return 1;
  const fromRateInTry = MARKET_RATES[from];
  const toRateInTry = MARKET_RATES[to];
  return fromRateInTry / toRateInTry;
};

export const formatCurrency = (amount: number, currency: Currency = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency }).format(amount);
};

export const fetchTCMBRate = async (date: string, from: Currency, to: Currency): Promise<number> => {
  if (from === to) return 1;

  try {
    // Hafta sonu kontrolü: Cumartesi (6) veya Pazar (0) ise Cuma gününe çek
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    
    if (dayOfWeek === 0) { // Pazar
      d.setDate(d.getDate() - 2);
    } else if (dayOfWeek === 6) { // Cumartesi
      d.setDate(d.getDate() - 1);
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const yearMonth = `${year}${month}`;
    const tcmbDate = `${day}${month}${year}`;

    // Bugünün tarihi mi?
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

    let url;
    if (isToday) {
      url = 'https://www.tcmb.gov.tr/kurlar/today.xml';
    } else {
      url = `https://www.tcmb.gov.tr/kurlar/${yearMonth}/${tcmbDate}.xml`;
    }

    // CORS Proxy kullanımı
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('TCMB verisi alınamadı');
    
    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    const getRate = (code: string) => {
      if (code === 'TRY') return 1;
      const currencyEl = xmlDoc.querySelector(`Currency[Kod="${code}"]`);
      if (!currencyEl) return null;
      const rateStr = currencyEl.querySelector('ForexSelling')?.textContent;
      return rateStr ? parseFloat(rateStr) : null;
    };

    const fromRate = getRate(from);
    const toRate = getRate(to);

    if (fromRate !== null && toRate !== null && toRate !== 0) {
      return fromRate / toRate;
    }
    
    return 0;
  } catch (error) {
    console.error("Kur çekme hatası:", error);
    return 0;
  }
};
