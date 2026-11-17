/**
 * PACE HQ · clima de cada loja (Vercel Serverless Function, sem chave)
 * GET /api/clima?lat=-27.59&lon=-48.58  → previsão de 8 dias (Open-Meteo)
 * GET /api/clima?q=Pedra%20Branca       → busca de local (geocodificação Open-Meteo, Brasil)
 * É a reserva do HQ: o navegador tenta a Open-Meteo direto e, se não conseguir, passa por aqui.
 * As respostas ficam em cache na Vercel (30 min a previsão, 1 dia a busca).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });
  const { lat, lon, q } = req.query || {};
  try {
    if (q != null) {
      const nome = String(q).trim().slice(0, 80);
      if (nome.length < 2) return res.status(400).json({ error: 'Busca muito curta' });
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=10&language=pt&countryCode=BR&format=json`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return res.status(502).json({ error: 'Busca indisponível' });
      const j = await r.json();
      const results = (j.results || []).map(x => ({ name: x.name, latitude: x.latitude, longitude: x.longitude, admin1: x.admin1, admin2: x.admin2, admin3: x.admin3, admin4: x.admin4 }));
      res.setHeader('Cache-Control', 'public, s-maxage=86400');
      return res.status(200).json({ results });
    }
    const la = Math.round(Number(lat) * 100) / 100, lo = Math.round(Number(lon) * 100) / 100;
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return res.status(400).json({ error: 'Coordenadas inválidas' });
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code,is_day,precipitation,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,cloud_cover_mean&timezone=America%2FSao_Paulo&past_days=6&forecast_days=8`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return res.status(502).json({ error: 'Previsão indisponível' });
    const j = await r.json();
    res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
    return res.status(200).json({ current: j.current, daily: j.daily });
  } catch (e) {
    return res.status(502).json({ error: 'Clima indisponível agora' });
  }
}
