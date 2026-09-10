# Status

**Status:** Fase 2 em execução — 3 de 40 tasks concluídas (7,5%); T2.04 no portão de teste humano
**Cliente:** Vibratto Assessoria Empresarial Ltda.
**Task ativa:** T2.04 — aguardando teste humano
**Última task concluída:** T2.03 — CA-2-038 (2026-09-10)
**Próxima task elegível:** T2.05 — CA-2-040 (instalação limpa, delete auditado, limpeza de fixtures)
**Preview:** https://tela-de-login-crm-a400a--preview.goskip.app
**Produção:** não publicada

## Evidência da T2.04 (implementada — aguardando teste humano)

- Endpoint server-side `GET /backend/v1/export/{entidade}` (hook `export_endpoint.js`, v0.0.111): saneia filtros, **recalcula quantidade no servidor**, exige aceite válido de **uso único** (mesmo usuário/entidade), gera CSV com neutralização OWASP e registra trilha append-only.
- Coleção `exportacoes` (migration 0025) — create/update/delete **null** pela API; só o endpoint grava.
- Frontend (`SearchPage.tsx`): exportação via `pb.send` ao endpoint; CSV baixado vem do servidor.
- Provas: sem aceite 403; sem auth 401; entidade inválida 400; aceite válido 200 + CSV correto; **reuso do aceite 403**; trilha com quantidade recalculada (8, não o declarado).
- Defeito corrigido durante o GREEN: `findFirstRecordByFilter` não aceita sort no JSVM (validação de uso único falhava) — corrigido com `findRecordsByFilter(sort '-ocorrido_em')` + epoch; aprendizado em `06_notas/aprendizado-continuo/AP-2026-09-10-t204-findfirst-sem-sort.md`.
- Evidências: `evidencias/spec-2-000/ca-2-039-red.md` / `ca-2-039-green.md`.

## Evidência da T2.03 (concluída — 2026-09-10)

- CSV neutraliza =, +, -, @; coleção `eventos_exportacao` append-only (cancelado/negado/falha); modal com 3 saídas rastreadas; bônus: Busca exibe nome da empresa. GitHub commit 5fa80c07.

## Evidência da T2.02 (concluída — 2026-09-10)

- Coleção `empresas` + `clientes.empresa` relation + backfill 6 empresas; aceite da consultora (Opção A). GitHub commit 85eef79.

## Evidência da T2.01 (concluída — 2026-09-10)

- 8 campos comerciais em `negocios` + validação server-side + auditoria de delete. GitHub commit 9ad54f1.

## Fase 1

Arquivada em `05_entregas/fase-1/` com `phase-closure-manifest.json` (24/24 tasks).

## Limitações

Integrações externas, IA, dados reais e operação financeira permanecem fora do escopo até seus gates específicos. Leitura via API PocketBase continua possível a usuários autenticados (inerente ao produto); a T2.04 fecha a geração de arquivos de exportação fora do endpoint autorizado.
