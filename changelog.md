# Changelog — CRM Vibratto

## [0.0.452] — 2026-09-13 — T3.07 CONCLUÍDA (teste humano aprovado pela CEO)

- 2026-09-13 · [Deni.Ai] · Task T3.07 concluída: Porta 1 — formulário público de entrada (SPEC-3-006, CA-3-018/019/020). Formulário `/entrada` sem login (90–120s, mobile-first, 3 blocos: identificação + qualificação + roteamento por sintoma), coleção `leads_entrada` append-only (0149), score 0–92 server-side com temperatura (quente ≥60 / morno 35–59 / frio <35), dedup por e-mail (negócio aberto <90 dias), rate limit por IP/hora (429 provado), honeypot silencioso, tempo mínimo 20s, UTM + origem declarada, LGPD duplo com versão LGPD-V1-2026-09, enriquecimento BrasilAPI informativo (falha não bloqueia), endpoint de vincular (contato + oportunidade saudável, re-vinculação 400). Provas RED 6 / GREEN 5 por API em evidencias/spec-3-006/; revalidação do zero na conclusão (401 sem auth; 400 sem consentimento/dor). Teste humano aprovado pela CEO em 2026-09-13 10:06 — "muito bom, validado!" (UI completa no celular: envio, LGPD, campos, confirmação). Limpeza 0150–0152 verificada (base 0 provas). Governança: fase.md T3.06/T3.07 ✅ (corrige linha T3.06 que ainda constava como aguardando teste), STATUS 8/N, controle.md + AP-2026-09-13-1006-jsvm-header-ip.md (leitura de header HTTP em request hook JSVM: e.request.header.get, não getHeader; provar por API antes de depender em regra de segurança).
- Aprendizado: AP-2026-09-13-1006-jsvm-header-ip.md (header HTTP em request hook JSVM).

## [0.0.451] — 2026-09-13 — T3.07 Porta 1 implementada (CA-3-018/019/020, aguardando teste humano)

### Adicionado

- **Formulário público de entrada (Porta 1)**: página `/entrada` (sem login, 90–120s, mobile-first) em 3 blocos — identificação (nome, e-mail, WhatsApp, decisor, CNPJ com máscara + enriquecimento BrasilAPI informativo, falha NÃO bloqueia), qualificação (faturamento, CNPJs do grupo, colaboradores, regime, ERP, quem cuida do financeiro) e roteamento por sintoma (dor principal, dores secundárias, relato, urgência, sonho 12 meses).
- **Coleção `leads_entrada`** (migration 0149, append-only — delete bloqueado): token, contato, qualificação, score (0–92 server-side), temperatura (quente ≥60 / morno 35–59 / frio <35), UTM (json), origem declarada, IP, LGPD duplo (consentimento obrigatório + opt-in marketing opcional), vínculo à oportunidade no dedup.
- **Hook `leads_entrada.js`**: `GET/POST /backend/v1/entrada/publico` (público), `GET /backend/v1/entrada/leads` (auth, filtro por temperatura), `POST /backend/v1/entrada/leads/{id}/vincular` (auth — cria contato dedup por e-mail + oportunidade saudável na primeira etapa ativa, responsável = ator, próxima ação +7 dias, canal derivado do UTM, `entrada_origem=formulario_entrada`).
- **Captura técnica**: honeypot (campo `website`), tempo mínimo 20s, rate limit por IP/hora (config `limite_entrada_por_ip_hora`, padrão 3; IP via realIp → X-Forwarded-For → Cf-Connecting-Ip; sem IP = fail-open com log), dedup por e-mail (negócio aberto <90 dias → registro `vinculado` + evento na oportunidade, sem criar duplicado).
- **Auditoria**: todo envio e vínculo geram evento em `auditoria` com snapshot mínimo (sem conteúdo do relato).
- Campo `entrada_origem` adicionado a `negocios` (0149).

### Provas (evidencias/spec-3-006/)

- RED 5: sem consentimento 400; tempo <20s 400; CNPJ inválido 400; GET leads sem auth 401; vincular sem auth 401; re-vincular 400.
- GREEN: envio válido 200 (score 92, quente); lista por temperatura 200; vincular 200 (contato + oportunidade criados); rate limit 429 no 4º envio do mesmo IP; honeypot 200 silencioso sem registro.
- Fixes no caminho: leitura de IP no JSVM (`e.request.header.get`, não `getHeader`) — 2 iterações provadas por API.
- Limpeza: migrations 0150/0151/0152 — base final verificada por API: 0 leads_entrada, 0 contatos de prova, 0 negócios de prova.
