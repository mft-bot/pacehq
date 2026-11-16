/**
 * PACE HQ · proxy do Claude para os agentes do escritório (Vercel Serverless Function)
 * Rota: POST /api/claude   { system: string, messages: [{role, content}] }  →  { text: string }
 *
 * A chave da API NUNCA fica no index.html. Configure na Vercel (Settings → Environment Variables):
 *   ANTHROPIC_API_KEY  (obrigatória)  chave da API do Claude
 *   PACE_TOKEN         (recomendada)  senha da equipe; o HQ envia no cabeçalho x-pace-token
 *   MODEL              (opcional)     padrão: claude-sonnet-5-5
 */
const MAX_MSGS = 14;
const MAX_CHARS = 60000;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  // Só aceita chamadas do próprio site (mesma origem)
  const origin = req.headers.origin || '';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  if (origin && new URL(origin).host !== host) return res.status(403).json({ error: 'Origem não autorizada' });

  // Senha da equipe (se configurada)
  if (process.env.PACE_TOKEN && req.headers['x-pace-token'] !== process.env.PACE_TOKEN)
    return res.status(401).json({ error: 'Senha da equipe inválida' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada' });

  const body = typeof req.body === 'string' ? safeJSON(req.body) : req.body || {};
  const system = typeof body.system === 'string' ? body.system : '';
  const clean = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_MSGS);
  while (clean.length && clean[0].role !== 'user') clean.shift();
  if (!clean.length || clean[clean.length - 1].role !== 'user') return res.status(400).json({ error: 'Conversa vazia' });
  if (system.length + clean.reduce((n, m) => n + m.content.length, 0) > MAX_CHARS) return res.status(413).json({ error: 'Mensagem muito longa' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.MODEL || 'claude-sonnet-5-5', max_tokens: 1200, system, messages: clean }),
    });
    if (!r.ok) return res.status(502).json({ error: `API respondeu ${r.status}` });
    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ error: 'Falha ao falar com a API' });
  }
}
function safeJSON(s) { try { return JSON.parse(s); } catch { return {}; } }
