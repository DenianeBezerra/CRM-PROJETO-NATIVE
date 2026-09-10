# Changelog — CRM Vibratto

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
