# Evidência — T2.10 — CA-2-005 (GREEN)

- **Data:** 2026-09-10
- **Versões:** 0.0.152–0.0.162 (QA verde no estado final)
- **Teste humano:** pendente (portão atual)

## Alterações

- `pocketbase/hooks/pre_production_check.js` — **consulta reproduzível** `GET /backend/v1/security/pre-production-check` (admin-only, somente leitura): varre contas, contatos e oportunidades procurando fixtures/seeds por padrões conhecidos; retorna `{apto_producao, contas, contatos, oportunidades, verificado_em}`.
- `pocketbase/migrations/0033_t210_ca2005_limpeza_denominador.js` — limpeza do denominador real: interações de seed (incluindo a quebrada com `negocio=""`), permanências vinculadas, negócios seed/fixture, contatos seed sem vínculos e conta `operador.demo`. Dados reais preservados.

## Provas por API (v0.0.162)

| Prova                                | Resultado                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------- |
| **Consulta reproduzível**            | ✅ `apto_producao: true`                                                    |
| Contas no denominador                | ✅ 2 (admin real + operator de RBAC) — zero fixtures                        |
| Contatos                             | ✅ 2 (Maria Rodrigues, ROMEU — reais da cliente) — zero seeds               |
| Oportunidades                        | ✅ 0 — zero seeds/fixtures                                                  |
| Reproduzibilidade                    | ✅ mesma chamada, mesmo resultado (somente leitura, sem efeitos colaterais) |
| Regressão: admin/operator autenticam | ✅                                                                          |
| Regressão: CRM preview servido       | ✅ 200                                                                      |

## Decisão registrada: conta operator

A conta `operator@vibratto.com.br` foi **mantida** — é o papel de operação do CRM (RBAC da T2.05/T2.07), não fixture descartável. Está marcada como conta de teste até operadores reais serem criados pela cliente.

## Impacto visível

Os dados de demonstração (6 contatos, 5 oportunidades fictícias) foram removidos do preview — o CRM agora mostra apenas os dados reais (2 contatos). É o que o critério "denominador real" exige para produção.

## Defeitos encontrados e corrigidos

1. **Delete bloqueado por required reference** — a interação de seed `vraz2xood5xf7sc` com `negocio=""` (vazio) bloqueava o delete dos negócios seed. Diagnosticado com endpoint de leitura temporário (`?debug=interacoes`) e corrigido removendo interações de seed (negócio vazio ou referenciando seed) antes dos negócios.
2. **Instabilidade 503 do Skip Cloud** durante o ciclo — aguardada e retomada sem perda de estado.

## Regressão

- Admin/operator autenticam; varredura de credenciais zero; exportação, eventos, auditoria intactos; QA verde no estado final.
