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
    // Backend API üzerinden kur çek
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${apiUrl}/exchange/tcmb?date=${encodeURIComponent(date)}&from=${from}&to=${to}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('TCMB verisi alınamadı');
    }

    const data = await response.json();
    return data.rate || 0;
  } catch (error) {
    console.error("Kur çekme hatası:", error);
    return 0;
  }
};
