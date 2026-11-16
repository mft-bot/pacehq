// Atualiza clima.json com a previsão de CADA loja PACE pela Open-Meteo (gratuita, sem chave).
// Reserva do Estreito. As outras lojas usam a Open-Meteo direto ou api/clima.js (automático).
// Sem lojas.json, usa só o Estreito. Roda no GitHub Actions ou localmente: node scripts/clima.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const PADRAO = [{ id: 'estreito', nome: 'Loja Estreito', local: 'Estreito, Florianópolis', lat: -27.5935, lon: -48.5862 }];
let lojas = PADRAO;
try {
  const j = JSON.parse(readFileSync(new URL('../lojas.json', import.meta.url), 'utf8'));
  const ok = (Array.isArray(j) ? j : []).filter(l => l && l.id && Number.isFinite(+l.lat) && Number.isFinite(+l.lon));
  if (ok.length) lojas = ok.map(l => ({ id: String(l.id), nome: String(l.nome || l.id), local: String(l.local || ''), lat: +l.lat, lon: +l.lon }));
} catch { /* sem lojas.json: segue com o Estreito */ }

// Código WMO → palavra que o index.html entende (wxKindFromText)
const cond = c => c >= 95 ? 'thunderstorm' : c >= 80 ? 'rain showers' : c >= 61 ? 'rain' : c >= 51 ? 'drizzle'
  : c >= 45 ? 'fog' : c >= 2 ? 'cloudy' : 'clear';
const r1 = n => Math.round(n * 10) / 10;
const now = new Date(), local = new Date(now.getTime() - 3 * 3600000).toISOString().slice(0, 19) + '-03:00'; // America/Sao_Paulo

async function previsao(l) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${l.lat}&longitude=${l.lon}`
    + '&current=temperature_2m,weather_code,is_day'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + '&timezone=America%2FSao_Paulo&forecast_days=8';
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`Open-Meteo respondeu ${r.status} para ${l.id}`);
  const j = await r.json(), d = j.daily;
  const days = d.time.map((date, i) => ({
    date, cond: cond(d.weather_code[i]), hi: r1(d.temperature_2m_max[i]), lo: r1(d.temperature_2m_min[i]),
    rain: d.precipitation_probability_max[i] ?? 0,
  }));
  if (!days.length || j.current?.temperature_2m == null) throw new Error(`Resposta sem dados para ${l.id}`);
  return {
    updated: local, place: l.local || l.nome, lat: l.lat, lon: l.lon,
    now: { temp: r1(j.current.temperature_2m), cond: cond(j.current.weather_code), is_day: !!j.current.is_day },
    today: days[0], tomorrow: days[1] || null, days,
  };
}

const porLoja = {};
for (const l of lojas) {
  try { porLoja[l.id] = await previsao(l); console.log(`${l.nome}: ${Math.round(porLoja[l.id].now.temp)}° · chuva hoje ${porLoja[l.id].today.rain}%`); }
  catch (e) { console.error(e.message); }
}
const ids = Object.keys(porLoja);
if (!ids.length) throw new Error('Nenhuma loja com previsão');
// O topo do arquivo repete a 1ª loja, para versões antigas do HQ continuarem funcionando.
writeFileSync(new URL('../clima.json', import.meta.url), JSON.stringify({ ...porLoja[ids[0]], lojas: porLoja }));
console.log(`clima.json atualizado · ${ids.length} loja(s)`);
