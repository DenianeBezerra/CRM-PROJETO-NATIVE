# Changelog — CRM Vibratto
## [0.0.518] — 2026-09-13 — T3.14 revalidada do zero (aguardando teste humano)

- 2026-09-13 · [Deni.Ai] · Revalidação do zero da T3.14 após reconciliação de estado (sessão anterior havia implementado até v0.0.516 com estado/STATUS desatualizados). RED por API: etapa sem auth 401; avaliar sem auth 401; avaliar com operator 403; etapa em obrigação inexistente 404. GREEN por API: avaliar admin 200 com dedup (0 novas — estado real intacto: 12 pendentes + 1 bloqueada; 3 exceções abertas). QA verde v0.0.518. Governança reconciliada: fase.md (linha T3.13 concluída + T3.14 adicionada), STATUS (task ativa T3.14), estado-atual (aguardando_teste_humano).


## [0.0.509] — 2026-09-13 — T3.13 CONCLUÍDA (teste humano aprovado pela CEO)

- 2026-09-13 · [Deni.Ai] · Task T3.13 concluída: Visão do analista — /operacao-dia + Obrigações no Meu dia (SPEC-3-013, CA-3-043 a CA-3-047). Teste humano aprovado pela CEO em 2026-09-13 13:43 — "aprovado, conclua e siga". Revalidação do zero: RED (401 baixa sem auth; 401 bloquear sem auth; 403 create manual — CA-3-042; 400 baixa em bloqueada; 400 bloquear sem motivo) + GREEN (baixa 1 toque 200 + reload reflete 12 + restauração 13; lote 3/3 + restauração; meus=1 13; estado real intacto: 13 pendentes — 12 previstas + 1 bloqueada; 3 exceções abertas). Browser real verificado (/operacao-dia com bloco de exceções no topo; /meu-dia com a nova seção). Pendência GitHub da governança RESOLVIDA (commits 696a1d9 e 210571d, byte-exato). Fase 3: 14/N.
- Aprendizado: AP-2026-09-13-1350-github-governanca-destino.md (destino da governança GitHub confirmado; push_files programático com byte-compare).

## [0.0.507] — 2026-09-13 — T3.13 implementada e provada (aguardando teste humano)

- 2026-09-13 · [Deni.Ai] · Task T3.13 implementada (autorização da CEO 13:33 — "corrija as pendencias que estiverem ao seu alcance e em seguida implemente o plan"). **Pendência GitHub resolvida**: governança sincronizada no repo DenianeBezerra/CRM-PROJETO-NATIVE via push_files com payload programático (conteúdo exato do working tree Skip) — commit 696a1d9, byte-compare EXATO nos 5 arquivos (fase.md, STATUS.md, changelog.md, estado-atual.md, SPEC-3-013).
- **Página `/operacao-dia`** (nova rota protegida + card na home): fonte única nos endpoints existentes da T3.12 (`GET /obrigacoes?dia=HOJE[&meus=1]` + `GET /excecoes`, sem alteração de contrato); bloco de destaque no topo com atrasos + exceções abertas; agrupamento por cliente ordenado por prazo; baixa em 1 toque (resultado opcional) + baixa em lote por cliente; bloqueio com motivo obrigatório (modal); link "Procedimento" para a ficha operacional (`/ficha-operacional?empresa={id}`); filtro Todas/Só minhas; visual harmonizado T3.09.
- **Seção "Obrigações operacionais" no `/meu-dia`** (T3.08): mesma fonte (`meus=1`), card resumido com baixa em 1 toque + link "Ver operação do dia →". Nenhuma nova fonte de dados.
- Provas RED por API: baixa sem auth 401; bloquear sem auth 401; create manual 404 (CA-3-042); baixa em bloqueada 400; bloquear sem motivo 400. GREEN por API: lista 13 pendentes (agrupável por cliente); baixa 1 toque 200 + reload reflete (12); lote 3/3; estado real restaurado (13 pendentes: 12 previstas + 1 bloqueada; 3 exceções abertas intactas). Browser real: /operacao-dia renderiza bloco de exceções no topo + "Nada vence hoje. Dia limpo."; /meu-dia com a nova seção.
- QA verde v0.0.507 (setup/static/build/integrations/test). Pendência anterior (sync GitHub da governança) RESOLVIDA.

## [0.0.506] — 2026-09-13 — T3.13 analisada, SPEC-3-013 publicada (aguardando autorização)

- 2026-09-13 · [Deni.Ai] · Seleção e análise da próxima leva após a conclusão da T3.12: **T3.13 — Visão do analista: /operacao-dia + seção "Obrigações operacionais" no Meu dia** (pendência explícita registrada na conclusão da T3.12; cap. 6.1 do documento da CEO). SPEC-3-013 publicada em `04-fase-atual/specs/`. Recorte: página `/operacao-dia` (fonte única nos endpoints existentes da T3.12 — `GET /obrigacoes?dia=HOJE` e `GET /excecoes`, sem alteração de contrato), bloco de atrasos + exceções abertas no topo, agrupamento por cliente ordenado por prazo, baixa em 1 toque + lote, bloqueio com motivo, link para a ficha operacional, filtro meus=1; seção resumida no `/meu-dia` (T3.08) com a mesma fonte (`meus=1`). Critérios CA-3-043 a CA-3-047. Fora do recorte: visões de coordenação/comercial (Leva C), E1–E9 automáticas (conector OMIE), criação manual de obrigação (nunca — CA-3-042). Nada implementado — estado `aguardando_autorizacao`.

## [0.0.505] — 2026-09-13 — T3.12 CONCLUÍDA (teste humano executado a pedido da CEO)

- 2026-09-13 · [Deni.Ai] · Task T3.12 concluída: Motor de Rotinas + Exceções (Leva B, SPEC-3-012). Teste humano executado pela Deni.Ai a pedido da CEO (13:09): 10 testes com a ficha real da Felicidade Collective — motor gerou 18 obrigações (ciclo completo), baixa 1 toque 200, lote 3/3, bloqueio com motivo 200, baixa em bloqueada 400, E10 resolvida pela baixa, dedup 2ª execução 0/18, regressão ok. Estado real preservado: 13 obrigações (12 previstas + 1 bloqueada), 4 exceções (3 abertas + 1 resolvida).
- Bug corrigido no teste: auditoria silenciosamente falhando — coleção `auditoria` só aceitava acao create/update (migration 0010) e try/catch engolia o erro; fix migration 0164 (motor_executado/baixa/baixa_lote/bloqueio/delete) + registro_id não vazio. Lição: try/catch de auditoria deve LOGAR, não engolir.
- Provas T3.12: RED 5 (401/403/404/400×2/403 create manual/403 delete) + GREEN (18 obrigações da ficha real; dedup 2ª exec 0/18; baixa+lote; bloqueio; reserva substituicao_aplicada=true; suspensão 0 novas). Limpeza 0163 — base 0 obrigações de prova, ficha Felicidade preservada.
- Lição GRAVE (AP-0200 extensão): helpers top-level chamados DENTRO de função inline (não callback direto) TAMBÉM derrubam o hook no runtime goja — rota dá "File not found" sem erro no QA. Fix: TODOS os helpers dentro de cada escopo.
- Pendências registradas para a próxima leva: UI /operacao-dia (visão do analista) e seção "Obrigações operacionais" no Meu dia — entraram como T3.13 (SPEC-3-013). E1–E9 automáticas dependem do conector OMIE (leva seguinte).

## [0.0.459] — 2026-09-13 — D2+D5 implementadas e provadas (correção autorizada pela CEO)

- 2026-09-13 · [Deni.Ai] · Correções D2/D5 da T3.07 (autorização da CEO 10:34 — "PODE IMPLEMENTAR"). **D2**: relato opcional com mínimo 30 chars — validação server-side no hook leads_entrada.js (400 com mensagem clara) + contador orientador no UI /entrada (placeholder com exemplo, contador âmbar abaixo de 30, ✓ ao atingir). **D5**: retenção 24 meses — hook leads_entrada_retencao.js com cron diário 03:00 (padrão audit_retention.js) + execução manual admin-only POST /backend/v1/entrada/retencao/executar (padrão T3.06); leads `novo` eliminados 24 meses após coleta ou último contato (trilha); delete via $app.delete em contexto sistema (deleteRule null bloqueia só a API — provado 403).
- Provas: D2 RED (10 chars → 400) + GREEN (43 chars → 200; sem relato → 200). D5 RED (sem auth 401) + GREEN funcional (fixture created retroativo 2024-08-01 via SQL em 0153 → execução manual removidos:1; leads reais intactos 3/3). Limpeza 0154 — base final 0 provas, 3 leads reais, rate limit restaurado para 3.
- Fixes: AP-0920 reincidente (constante top-level em callback de cron → inline, v0.0.456); rate limit elevado temporariamente para 100 durante a prova GREEN D2 e restaurado.
- QA verde v0.0.455–0.0.459. Governança GitHub commit 4242668 byte-compare OK.

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
