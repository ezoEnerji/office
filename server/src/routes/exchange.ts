import express from 'express';
import axios from 'axios';

const router = express.Router();

// TCMB Exchange Rate Proxy
router.get('/tcmb', async (req, res) => {
  try {
    const { date, from, to } = req.query;

    if (!date || !from || !to) {
      return res.status(400).json({ error: 'date, from ve to parametreleri gerekli' });
    }

    if (from === to) {
      return res.json({ rate: 1 });
    }

    // Hafta sonu kontrolü: Cumartesi (6) veya Pazar (0) ise Cuma gününe çek
    const d = new Date(date as string);
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

    // TCMB'den XML çek
    const response = await axios.get(url, {
      timeout: 10000, // 10 saniye timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const xmlText = response.data;
    
    // XML parse et (basit regex ile)
    const getRate = (code: string): number | null => {
      if (code === 'TRY') return 1;
      
      // Currency[Kod="USD"] gibi pattern'i bul
      const currencyPattern = new RegExp(`<Currency[^>]*Kod="${code}"[^>]*>([\\s\\S]*?)<\\/Currency>`, 'i');
      const match = xmlText.match(currencyPattern);
      
      if (!match) return null;
      
      // ForexSelling değerini bul
      const forexPattern = /<ForexSelling>([^<]+)<\/ForexSelling>/i;
      const forexMatch = match[1].match(forexPattern);
      
      if (!forexMatch) return null;
      
      const rate = parseFloat(forexMatch[1]);
      return isNaN(rate) ? null : rate;
    };

    const fromRate = getRate(from as string);
    const toRate = getRate(to as string);

    if (fromRate !== null && toRate !== null && toRate !== 0) {
      return res.json({ rate: fromRate / toRate });
    }
    
    return res.status(404).json({ error: 'Kur bulunamadı' });
  } catch (error: any) {
    console.error('TCMB kur çekme hatası:', error.message);
    return res.status(500).json({ error: 'TCMB kur verisi alınamadı', message: error.message });
  }
});

export default router;

