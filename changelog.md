# Changelog — CRM Vibratto

## [0.0.187] — 2026-09-11 — T2.13 implementada (CA-2-008, EM CORREÇÃO — GREEN 2 pendente)

### Adicionado

- **Bloqueio de avanço com pendência obrigatória** (CA-2-008): hook server-side em `negocios` bloqueia avanço de etapa quando há perguntas obrigatórias da etapa atual sem resposta; recuo e etapa final não são bloqueados.
- **Exceção de liberação (admin-only)**: coleção `excecoes_qualificacao` (negócio, motivo ≥ 10 caracteres, validade futura, criado_por) com update/delete bloqueados (append-only); endpoint `POST /backend/v1/qualificacao/{negocio}/excecao`.
- **UI**: no modal "Qualificar", admin vê "Liberar por exceção" quando há pendências obrigatórias; operador vê aviso de bloqueio.

### Provas por API (v0.0.185)

- RED: avanço bloqueado 400 ✅; operator cria exceção 403 ✅; motivo curto 400 ✅; validade passada 400 ✅.
- GREEN: exceção válida criada 200 ✅. **Pendente**: avanço liberado pela exceção (GREEN 2) — em correção.

### Corrigido (integração JSVM)

- Hook checava obrigatórias da etapa NOVA; correto é da etapa ATUAL (a que está sendo deixada) — v0.0.185.
- Parse de validade: datas PB vêm com espaço ("2026-09-30 00:00:00.000Z"); Date.parse do JSVM exige "T" — v0.0.187 (revalidação pendente).

## [0.0.254] — 2026-09-11 — T2.24 CONCLUÍDA (teste humano aprovado) — SPEC-2-004 FECHADA

### Concluído

- CA-2-019 fechado: aceite ou recusa registra ator, data, canal, observação e mantém a decisão como humana (401 sem autenticação; só proposta emitida decide; canal e observação obrigatórios; atômico).
- Teste humano aprovado pela cliente (2026-09-11 23:05 — "conclua").
- Revalidação independente: v10 aceita (whatsapp) e v12 recusada (email) com ator/data/canal/observação completos, "Proposta BPO" íntegra, preview 200.
- **SPEC-2-004 FECHADA (4/4)** — Fase 2: 24/40 (60%).

## [0.0.250] — 2026-09-11 — T2.23 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-018 fechado: status inválido, valor negativo, validade passada e emissão concorrente bloqueados atomicamente.
- Teste humano aprovado pela cliente (2026-09-11 23:00 — "aprovado").
- Revalidação independente: propostas v1–v6 íntegras, "Proposta BPO" em `novo`, preview 200.
- Fase 2: 23/40 (57,5%).

### Corrigido (defeito da T2.22)

- Emissão não era atômica: duas emissões paralelas gravavam ambas (200/200). Corrigido com `runInTransaction` + re-checagem de status dentro da transação — provado por API (200 + 400).

## [0.0.245] — 2026-09-11 — T2.22 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-017 fechado: emissão congela a versão; mudança posterior cria número sequencial sem sobrescrever histórico.
- Teste humano aprovado pela cliente (2026-09-11 22:56 — "validado, conclua e siga a proxima").
- Revalidação independente: emissão re-provada por API (v6 emitida com ator/data), v4 congelada intacta, "Proposta BPO" íntegra, preview 200.
- Fase 2: 22/40 (55%).

## [0.0.241] — 2026-09-11 — T2.21 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-016 fechado: usuário autorizado cria rascunho de proposta com valor, validade, responsável e resumo válidos.
- Teste humano aprovado pela cliente (2026-09-11 22:51 — "validado, proximo"; v3 criada pela UI: R$ 8.000, validade 20/06/2027).
- Revalidação independente: 3 rascunhos no histórico, "Proposta BPO" íntegra, preview 200.
- Fase 2: 21/40 (52,5%).

## [0.0.237] — 2026-09-11 — T2.20 CONCLUÍDA (teste humano aprovado) — SPEC-2-003 FECHADA

### Concluído

- CA-2-015 fechado: consulta 360º exibe versão atual, histórico completo e campos ausentes explicitamente.
- Teste humano aprovado pela cliente (2026-09-11 22:46 — "Aprovado. Siga para a proxima"; print: quadro consolidado, v6 atual, histórico 6 versões expandido).
- Revalidação independente: endpoint 200 com ausentes=[], fixture removida (404), "Proposta BPO" íntegra, preview 200.
- **SPEC-2-003 FECHADA (5/5)** — Fase 2: 20/40 (50%).

## [0.0.232] — 2026-09-11 — T2.19 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-014 fechado: data passada, responsável inativo e texto acima de 5.000 caracteres são rejeitados sem estado parcial.
- Teste humano aprovado pela cliente (2026-09-11 22:41 — "Aprovado, todos passaram").
- Revalidação independente: "Proposta BPO" íntegra (responsável ativo, próxima ação 20/10, 1 permanência em `novo`), usuário de prova removido, preview 200.
- Fase 2: 19/40 (47,5%).

## [0.0.229] — 2026-09-11 — T2.18 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-013 fechado: oportunidade ativa persiste responsável e próxima ação futura — ou exceção vigente libera (fila é da SPEC-2-005).
- Teste humano aprovado pela cliente (2026-09-11 22:34 — "funcionou, conclua e siga a proxima task").
- Revalidação independente: "Proposta BPO" íntegra (responsável ok, próxima ação 20/10, 1 permanência em `novo`), fixture removida (404), preview 200.
- Fase 2: 18/40 (45%).

### Notas

- Defeito de integração corrigido: função top-level rejeitada no deploy (scoping do JSVM) — lógica inline nos callbacks (padrão do guia, §2).

## [0.0.224] — 2026-09-11 — T2.17 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-012 fechado: edição preserva versão anterior, ator, data e motivo — toda alteração cria nova versão com motivo da atualização obrigatório a partir da v2 (mín. 10 caracteres).
- Teste humano aprovado pela cliente (2026-09-11 22:29 — "funcionou, conclua e siga a proxima task").
- Revalidação independente: v6 com motivo/ator/data gravada, v1–v5 preservadas (append-only), fixture removida (404), "Proposta BPO" íntegra, preview 200.
- Fase 2: 17/40 (42,5%).

## [0.0.220] — 2026-09-11 — T2.16 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-011 fechado: operador cria versão de diagnóstico com núcleo mínimo (resumo ≥ 20 caracteres) e vínculo inequívoco à oportunidade; versão sequencial calculada no servidor.
- Teste humano aprovado pela cliente (2026-09-11 22:21 — "funcionou, todas as rtapas passaram"; v5 criada pela UI).
- Revalidação independente: 5 versões no histórico, auditoria cobre diagnosticos, "Proposta BPO" íntegra em `novo`, preview 200.
- Fase 2: 16/40 (40%).

## [0.0.214] — 2026-09-11 — T2.15 CONCLUÍDA (teste humano aprovado) — SPEC-2-002 FECHADA

### Concluído

- CA-2-010 fechado: alterações e exceções da qualificação na auditoria com ator, data e snapshots.
- Teste humano aprovado pela cliente (2026-09-11 22:09 — "todas as etapas passaram, conclua e siga a proxima etapa"; print: qualificação 100%, 1 de 1 respondidas).
- Revalidação independente: resposta do operator auditada (evento create com ator e data), exceção provada por API (evento com ator e snapshot), perguntas/respostas/exceções cobertas.
- **SPEC-2-002 FECHADA (5/5)** — Fase 2: 15/40 (37,5%).

### Limitação documentada

- Evento 'negado' na coleção `auditoria` é tecnicamente inviável no JSVM v0.36 (save em request hook participa da transação e é revertido pelo rollback — provado com 3 mecanismos). Trilha em log estruturado; alternativa definitiva (rota custom de avanço) registrada como DÚVIDA para o consultor.

## [0.0.212] — 2026-09-11 — T2.15 implementada (CA-2-010, aguardando teste humano)

### Adicionado

- **Auditoria da qualificação** (CA-2-010): `perguntas_qualificacao`, `respostas_qualificacao` e `excecoes_qualificacao` agora geram eventos append-only com ator, data e snapshots (create/update/delete).
- Endpoint de exceção grava evento de auditoria explicitamente (rota custom não passa pelos request hooks de CRUD).
- Tentativa negada (avanço bloqueado / desqualificação sem próxima ação) registra trilha estruturada com ator, etapas e motivo.

### DÚVIDA (para o consultor)

- Evento 'negado' na coleção `auditoria`: no JSVM v0.36, qualquer `$app.save` em request hook participa da transação do request — um evento gravado antes do erro é revertido pelo rollback (provado por API com 3 mecanismos: throw, e.json(400), e.badRequestError). O JSVM não expõe hook de erro. Trilha provisória em log estruturado (Skip preserva). Alternativa definitiva: rota custom de avanço de etapa fora da transação CRUD — requer decisão de produto.

### Notas

- Evidências: `evidencias/spec-2-002/ca-2-010-green.md`. Limpeza: migration 0048.
- 2026-09-11 · [Deni.Ai] · DEBUG task T2.15: evento 'negado' não sobrevivia ao rollback da transação → causa raiz documentada (JSVM v0.36, transação do request) → trilha em log estruturado + dúvida registrada para o consultor.

## [0.0.204] — 2026-09-11 — T2.14 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-009 fechado: desqualificação exige motivo estruturado, detalhe obrigatório para "Outro" e **próxima ação** (descrição + data futura); registro já perdido pode ser editado sem reexigir.
- Teste humano aprovado pela cliente (2026-09-11 21:54 — "todas as etapas passaram como orientado").
- Revalidação independente: RED (sem próxima ação → 400), fixture removida (404), "Proposta BPO" íntegra (1 permanência aberta em `novo`, resíduo de motivo limpo), preview 200.

### Adicionado

- Regra server-side em `outcome_rules.js` (request hook): próxima ação obrigatória na desqualificação, com descrição e data futura.
- Validação client-side espelhada no formulário de Oportunidades.

### Notas

- Evidências: `evidencias/spec-2-002/ca-2-009-green.md`. Migrations 0045–0047 (reparos de permanências + limpeza da fixture).
- Lição: prova GREEN em registro com histórico corrompido falha no guard de permanências — isolar prova em fixture.
- Fase 2: 14/40 (35%).

## [0.0.199] — 2026-09-11 — T2.13 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-008 fechado: operador não avança com pergunta obrigatória sem resposta; administrador libera por exceção com motivo (mín. 10 caracteres), validade futura e ator registrados (coleção append-only `excecoes_qualificacao`).
- Teste humano aprovado pela cliente (2026-09-11, 21:45 — "todos passaram, conclua a T2.13").
- Revalidação independente do zero (9 provas por API): RED 400/400/403, GREEN 200/200, retorno 200, permanências consistentes (1 aberta em `novo`), preview 200.

### Corrigido (debug — causa raiz documentada)

- Bloqueio de avanço movido de model hook para **request hook**: a versão anterior corrompia o histórico de permanências a cada bloqueio (permanência fantasma), e o guard do `stage_dwell_history` travava todo avanço seguinte com 400 genérico. Reparo do histórico na migration 0042.
- Frontend de Oportunidades agora exibe a mensagem de erro server-side (antes: mensagem genérica).

### Notas

- Evidências: `evidencias/spec-2-002/ca-2-008-red.md` / `ca-2-008-green.md`; debug em `06_notas/debug/debug-2026-09-11-t213-green-excecao.md`.
- Denominador limpo (migrations 0043/0044): 0 exceções de prova; "Proposta BPO" preservada em `novo`, completude 0%.
- Fase 2: 13/40 (32,5%).

## [0.0.183] — 2026-09-10 — T2.12 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-007 fechado: operador salva qualificação válida e visualiza percentual e pendências de completude.
- Teste humano aprovado com print (oportunidade "Proposta BPO" com botão "Qualificar").
- Revalidação independente: oportunidade real preservada, completude 0% com 1 pendência obrigatória (correto — ainda não respondida), preview 200.
- Fase 2: 12/40 (30%).

## [0.0.178] — 2026-09-10 — T2.12 implementada (CA-2-007, aguardando teste humano)

### Adicionado

- **Qualificação do operador** (CA-2-007): coleção `respostas_qualificacao` (negócio + pergunta, resposta por tipo, respondido_por/em), botão "Qualificar" na tela de Oportunidades com barra de percentual, contador de pendências obrigatórias e formulário por tipo de pergunta.
- Endpoint server-side `GET /backend/v1/qualificacao/{negocio}/completude` — recalcula no servidor perguntas aplicáveis à etapa, respostas, percentual e pendências.
- Validação server-side: pergunta ativa, número obrigatório (corpo cru), escolha única restrita às opções, unicidade negócio+pergunta.

### Corrigido (integração JSVM — 5 defeitos, lições documentadas)

- Sort inexistente no endpoint (`updated` → `respondido_em`).
- Índice UNIQUE composto sobre relations derrubava todo INSERT (400 genérico) → índice simples + unicidade no hook.
- `set()` manual em campo autodate gera 400 → autodate se preenche sozinho.
- Bind params `{:x}` no findRecordsByFilter falha no JSVM → interpolação direta de IDs.
- Número ausente vira 0 no model hook (zero value) → validação movida ao request hook.

### Notas

- Limpeza das provas: negócio-fixture, respostas e ativações temporárias removidos (migrations 0036–0038); 2 respostas órfãs remanescentes sem negócio vinculado (sem efeito no denominador).
- QA verde v0.0.167–0.0.178. Evidências: `evidencias/spec-2-002/ca-2-007-red.md` / `ca-2-007-green.md`.

## [0.0.166] — 2026-09-10 — T2.11 CONCLUÍDA (teste humano aprovado)

### Concluído

- CA-2-006 fechado: administrador configura perguntas, obrigatoriedade, ordem e aplicabilidade sem código.
- Revalidação independente pós-aprovação: coleção íntegra (3 registros, 0 ativos), operator lê 200 / cria 400, preview 200.
- Teste humano aprovado com prints (criação, edição, inativação/reativação).

## [0.0.164] — 2026-09-10 — T2.11 implementada (CA-2-006, aguardando teste humano)

### Adicionado

- **Configuração de qualificação sem código** (CA-2-006): coleção `perguntas_qualificacao` (texto, tipo, opções, obrigatoriedade, ordem, aplicabilidade por etapa, ativa) com create/update admin-only e delete bloqueado (append-only, padrão `etapas_negocio`).
- Tela admin `/admin/qualificacao` — criar, editar, inativar/reativar perguntas; sugere próxima ordem (+10); validação client + server.
- Validação server-side (`qualificacao_config_rules.js`): texto ≥ 3, ordem inteira ≥ 0, escolha_unica exige ≥ 2 opções, unicidade de ordem entre ativas.
- Links "Etapas comerciais · Qualificação" na home admin (acessibilidade de telas admin).

### Notas

- SPEC-2-002 não possui arquivo em specs/ — critério de origem é a tabela da fase.md (padrão das SPECs anteriores).
- Preenchimento da qualificação pelo operador (percentual/completude) é a T2.12 (CA-2-007).
- QA verde v0.0.164. RED/GREEN provados por API; perguntas de prova inativadas (denominador limpo).

## [0.0.163] — 2026-09-10 — T2.10 concluída (SPEC-2-001 FECHADA 10/10)

### Adicionado

- **Consulta reproduzível de aptidão para produção** (CA-2-005): `GET /backend/v1/security/pre-production-check` (admin-only, somente leitura). Varre contas, contatos e oportunidades procurando fixtures/seeds por padrões conhecidos; retorna `{apto_producao, contas, contatos, oportunidades, verificado_em}`. Reexecutável com resultado determinístico.

### Removido (limpeza do denominador real — migration 0033)

- 6 contatos seed de demonstração (Juliana Vasconcelos, Rodrigo Alcantara, Camila Fernandes, Marcelo Pires de Castro, Fernanda Albuquerque Ribeiro, Eduardo Martins Soares) e 5 oportunidades fictícias (Nexus Tech, Alcantara, TransBrasil, Bella Casa, Albuquerque) da migration 0006.
- 6 interações de seed (incluindo a quebrada com `negocio=""` que bloqueava o delete) e permanências vinculadas.
- Fixtures de teste remanescentes: RED T201 Fixture Contato, G4 Fixture T202, =CMD T203 fixture, negócio "TESTE".
- Conta de demonstração `operador.demo@vibratto.com.br` (seed de RBAC antigo).
- **Preservados**: dados reais (Maria Rodrigues, ROMEU, empresa AG) e a conta `operator@vibratto.com.br` (papel de operação, marcada como teste até operadores reais).

### Corrigido

- Delete bloqueado por required reference em interação de seed com `negocio` vazio — interações de seed agora são removidas antes dos negócios.

### Notas

- Deletes de limpeza via migration não passam pelos hooks de auditoria (sem trilha) — aceito para seeds/fixtures; documentado como limitação.
- UX: telas sem resultados não exibem estado "nenhum resultado" (backlog).
- QA verde v0.0.152–0.0.163. Teste humano aprovado pela cliente (print /contatos).
