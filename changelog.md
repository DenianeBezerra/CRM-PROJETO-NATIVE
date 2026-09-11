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
