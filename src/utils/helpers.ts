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
    // Backend API üzerinden kur çek (public endpoint, token gerekmez)
    // Production'da mevcut protokolü kullan (HTTPS/HTTP), development'ta localhost
    const getApiUrl = () => {
      const envUrl = import.meta.env.VITE_API_URL;
      if (envUrl) {
        return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
      }
      
      if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.host}/api`;
      }
      
      return 'http://localhost:3001/api';
    };
    
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/exchange/tcmb?date=${encodeURIComponent(date)}&from=${from}&to=${to}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'TCMB verisi alınamadı' }));
      throw new Error(errorData.error || 'TCMB verisi alınamadı');
    }

    const data = await response.json();
    return data.rate || 0;
  } catch (error: any) {
    console.error("Kur çekme hatası:", error);
    return 0;
  }
};
