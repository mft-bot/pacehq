// Atualiza clima.json com o clima do Estreito (Florianópolis/SC) pela Open-Meteo (gratuita, sem chave).
// Roda no GitHub Actions (.github/workflows/clima.yml) ou localmente: node scripts/clima.mjs
import { writeFileSync } from 'node:fs';

const LAT = -27.5935, LON = -48.5862, PLACE = 'Estreito, Florianópolis';
const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}`
  + '&current=temperature_2m,weather_code,is_day'
  + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
  + '&timezone=America%2FSao_Paulo&forecast_days=8';

// Código WMO → palavra que o index.html entende (wxKindFromText)
const cond = c => c >= 95 ? 'thunderstorm' : c >= 80 ? 'rain showers' : c >= 61 ? 'rain' : c >= 51 ? 'drizzle'
  : c >= 45 ? 'fog' : c >= 2 ? 'cloudy' : 'clear';

const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
if (!r.ok) throw new Error(`Open-Meteo respondeu ${r.status}`);
const j = await r.json(), d = j.daily;
const days = d.time.map((date, i) => ({
  date, cond: cond(d.weather_code[i]),
  hi: Math.round(d.temperature_2m_max[i] * 10) / 10,
  lo: Math.round(d.temperature_2m_min[i] * 10) / 10,
  rain: d.precipitation_probability_max[i] ?? 0,
}));
if (!days.length || j.current?.temperature_2m == null) throw new Error('Resposta sem dados');

const now = new Date(), off = -3 * 60; // America/Sao_Paulo (sem horário de verão)
const local = new Date(now.getTime() + off * 60000).toISOString().slice(0, 19) + '-03:00';
const out = {
  updated: local, place: PLACE,
  now: { temp: Math.round(j.current.temperature_2m * 10) / 10, cond: cond(j.current.weather_code), is_day: !!j.current.is_day },
  today: days[0], tomorrow: days[1] || null, days,
};
writeFileSync(new URL('../clima.json', import.meta.url), JSON.stringify(out));
console.log(`Clima atualizado: ${Math.round(out.now.temp)}° · ${out.now.cond} · chuva hoje ${days[0].rain}% · ${days.length} dias`);
