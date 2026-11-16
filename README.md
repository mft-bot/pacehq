# PACE HQ · Escritório Virtual

Escritório virtual da PACE (loja de mobilidade elétrica no Estreito, Florianópolis).
Ele reúne a operação inteira: vendas, test rides, oficina, pós-venda, metas e marketing.
É uma página estática (`index.html`) com quatro agentes, um por sala (Comercial, Oficina, Admin e Growth) e o clima automático de cada loja.

## Estrutura

| Arquivo | Para que serve |
|---|---|
| `index.html` | O escritório inteiro (HTML, CSS e JS num arquivo só) |
| `sprites/` | Imagens dos agentes |
| `clima.json` | Reserva do clima do Estreito, atualizada sozinha pelo GitHub Actions |
| `api/clima.js` | Clima de qualquer loja pela Vercel (reserva automática, sem chave) |
| `scripts/clima.mjs` | Busca a previsão de 8 dias de cada loja na Open-Meteo (gratuita, sem chave) |
| `.github/workflows/clima.yml` | Roda o clima às 07:53, 11:53 e 16:53 (horário de Brasília) |
| `api/claude.js` | Proxy da Vercel para os agentes falarem com o Claude (a chave fica só no servidor) |
| `vercel.json` | Cabeçalhos de segurança e sem cache para o `clima.json` |

## Publicar na Vercel

1. **Repositório privado.** Ele contém regras de negócio, preços e os prompts dos agentes.
2. Na Vercel, importe o repositório: **Add New → Project**.
   - Framework: **Other**.
   - Sem build: a raiz já é o site.
3. Em **Settings → Environment Variables**, cadastre:
   - `ANTHROPIC_API_KEY`: chave da API do Claude. Nunca coloque no código.
   - `PACE_TOKEN`: senha da equipe. Cada pessoa digita no HQ em **Dados → Conexão com o Claude**.
   - `MODEL` (opcional): padrão `claude-sonnet-5-5`.
4. Em **Settings → Deployment Protection**, ative a proteção do site para que só a equipe acesse.
5. O clima funciona sozinho: o workflow faz commit do `clima.json`, e a Vercel republica.
   - Para testar na hora: **Actions → Atualizar clima → Run workflow**.

## Dados e segurança (leia antes de usar)

- **Cada navegador tem os seus dados.** Leads, vendas e carteira ficam no `localStorage`, não no servidor nem no repositório.
  - Para passar dados entre os sócios ou para uma nova versão do HQ: **Menu → Exportar tudo (arquivo)** na versão antiga e **Menu → Importar tudo** na nova. O pacote leva todos os dados e preferências, mostra um resumo antes de substituir, e dá para voltar em **Desfazer última importação**.
  - Um banco de dados compartilhado é um próximo passo.
- **Nunca versionar dados de clientes:** CSVs, planilhas e backups `.json` estão no `.gitignore`.
- **Nunca entram no HQ:**
  - CPF, endereço/CEP, e-mail, data de nascimento e custos;
  - o importador do painel de gestão descarta essas colunas antes de gravar.
- **Agentes de IA:** recebem só números agregados, sem nomes nem telefones de clientes.
- **QR do Passaporte Digital:** nunca entra neste projeto.
- **Os dados de exemplo dentro do `index.html` são fictícios.**

## Rodar localmente

Abra o `index.html` no navegador ou sirva a pasta:

```
npx serve .
```

Para atualizar o clima à mão: `node scripts/clima.mjs`.

## Clima por loja (automático)

Basta cadastrar a loja no HQ (seletor de loja → Nova loja) com **bairro e cidade**. O HQ acha a localização sozinho e passa a mostrar o clima daquela loja.
- O navegador busca a previsão direto na Open-Meteo. Se não conseguir, usa `api/clima.js` aqui na Vercel (sem chave, com cache).
- Para ajustar o ponto exato, edite **Local do clima** na loja (aceita coordenadas do Google Maps).
- O `clima.json` do GitHub Actions continua como reserva do Estreito; não precisa mexer nele.

## Fluxo de trabalho entre os sócios

- **`main`** = versão que está no ar (a Vercel publica a cada push).
- **Mudanças grandes:** crie uma branch e abra um Pull Request. A Vercel gera um link de prévia para revisar antes de juntar.
