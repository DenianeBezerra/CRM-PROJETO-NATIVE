# Evidência — T2.05 — CA-2-040 (GREEN)

- **Data:** 2026-09-10
- **Versões:** 0.0.115–0.0.119 (QA verde)
- **Teste humano:** pendente (portão atual)

## Alterações

- `pocketbase/migrations/0026_t205_ca2040_auditoria_retencao.js` — campo `retido_ate` (date) na `auditoria` + backfill idempotente (ocorrido_em + 365 dias) + **regras de leitura por papel**: admin vê tudo; operator só os próprios atos (`ator_id = @request.auth.id`).
- `pocketbase/hooks/audit_retention.js` — cron diário (03:00) remove eventos com `retido_ate` vencido (contexto sistema `$app`, sem ator).
- `pocketbase/migrations/0027_t205_limpeza_fixtures.js` — limpeza idempotente das fixtures de teste (aceite forjado RED-T204, eventos GREEN T2.03, trilhas de teste T2.04), preservando os registros reais da cliente.

## Provas por API (v0.0.119)

| Prova                                | Resultado                                                                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Operator vê SÓ os próprios atos      | ✅ 55 → **1 evento** (o próprio)                                                                                                         |
| Admin continua vendo tudo            | ✅ 56 eventos                                                                                                                            |
| Retenção definida (365 dias)         | ✅ `retido_ate` preenchido em todos os eventos (backfill)                                                                                |
| **Cron de retenção remove vencidos** | ✅ fixture com `retido_ate` no passado criada e **removida pela mesma lógica do cron** (rota de debug temporária, depois removida — 404) |
| Fixtures de teste zeradas            | ✅ aceite forjado 0 · eventos GREEN T2.03 0 · trilhas de teste 0 (trilha real da cliente preservada)                                     |
| Delete auditado (regressão)          | ✅ 5 eventos `delete` com snapshot na auditoria                                                                                          |
| Migrations sem IDs de ambiente       | ✅ revisão documentada das 27 migrations — todas localizam coleções por nome                                                             |

## Instalação limpa (primeiro critério)

Nenhuma das 27 migrations depende de ID de ambiente: coleções e campos são localizados por nome (`findCollectionByNameOrId`), backfills são idempotentes (verificam estado antes de operar) e o roll back desfaz por nome. A sequência 0001→0027 aplica-se a qualquer ambiente novo.

## Defeitos encontrados e corrigidos

- Nenhum novo. Padrões JSVM das tasks anteriores aplicados (try/catch em finders, datas por epoch, rota de debug removida com 404 confirmado).

## Regressão

- Fluxo de exportação (T2.04), eventos (T2.03), empresas (T2.02) e campos comerciais (T2.01) intactos; QA 0.0.115–0.0.119 verde.
