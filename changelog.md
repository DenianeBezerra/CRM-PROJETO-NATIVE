# Changelog — CRM Vibratto

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
