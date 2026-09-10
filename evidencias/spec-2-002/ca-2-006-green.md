# Evidência — T2.11 — CA-2-006 (RED/GREEN)

- **Data:** 2026-09-10
- **Versão:** 0.0.164 (QA verde: setup, staticAnalysis, build, integrations, test — todos ok)
- **Teste humano:** pendente (portão atual)

## Alterações

- `pocketbase/migrations/0034_t211_ca2006_perguntas_qualificacao.js` — coleção `perguntas_qualificacao`: texto (máx. 500), tipo (texto_livre/numero/sim_nao/escolha_unica), opcoes (para escolha_unica), obrigatoria, ordem, aplicavel_a (todas/novo/contato_feito/proposta), ativa, sistema. Regras: leitura para autenticados; create/update **admin-only**; delete **null** (append-only, igual `etapas_negocio`).
- `pocketbase/hooks/qualificacao_config_rules.js` — validação server-side (model hooks): texto ≥ 3 caracteres, ordem inteira ≥ 0, escolha_unica exige ≥ 2 opções separadas por ";", unicidade de ordem entre perguntas ativas.
- `src/pages/Qualificacao.tsx` — tela admin `/admin/qualificacao`: criar, editar, inativar/reativar perguntas **sem código**; sugere próxima ordem (+10).
- `src/App.tsx` — rota `/admin/qualificacao` protegida por `AdminRoute`.
- `src/pages/Home.tsx` — links "Etapas comerciais · Qualificação" na home admin (corrige acessibilidade de tela admin — lição do roteiro da T2.01).

## Provas por API (backend interno, v0.0.164)

| Prova                                                  | Resultado                                      |
| ------------------------------------------------------ | ---------------------------------------------- |
| **RED: texto curto ("ab")**                            | ✅ 400 — rejeitado                             |
| **RED: ordem negativa (-5)**                           | ✅ 400 — rejeitado                             |
| **RED: escolha_unica com 1 opção**                     | ✅ 400 — rejeitado                             |
| **RED: ordem duplicada entre ativas**                  | ✅ 400 — rejeitado pelo hook                   |
| **GREEN: criar pergunta válida (número, ordem 10)**    | ✅ 200 — criada                                |
| **GREEN: criar escolha_unica com 3 opções (ordem 20)** | ✅ 200 — criada                                |
| **GREEN: admin edita pergunta (update sem código)**    | ✅ 200                                         |
| **RBAC: operator tenta criar**                         | ✅ 400/403 — bloqueado (createRule admin-only) |
| **RBAC: operator lê perguntas**                        | ✅ 200 (listRule autenticado)                  |
| **Delete direto (mesmo admin)**                        | ✅ 403 — append-only preservado                |
| **Regressão: preview servido**                         | ✅ 200                                         |

## Estado final (denominador real limpo — lição T2.10)

- As 2 perguntas usadas nas provas foram **inativadas** (ativa=false) — delete é bloqueado por design (append-only). Zero perguntas ativas restantes; a configuração real cabe à cliente pela tela.

## Observação de governança

- O arquivo `SPEC-2-002` não existe em `04-fase-atual/specs/` (mesmo padrão de SPEC-2-000/001). O critério de origem usado é a tabela da fase.md: "T2.11 — CA-2-006 — administrador configura perguntas, obrigatoriedade, ordem e aplicabilidade sem código".
- Escopo deliberado: a T2.11 entrega a **configuração** das perguntas. O preenchimento da qualificação pelo operador (percentual/completude) é a T2.12 (CA-2-007). Nenhuma regra de negócio de qualificação foi inventada — ativação real reservada à consultora/cliente (dependência da fase).

## Auditoria

- `perguntas_qualificacao` não está no escopo do `audit_crm_changes.js` (clientes/negocios/etapas_negocio/interacoes) — alterações de configuração ficam registradas pelo próprio histórico da coleção (updated/updated_by não aplicável) e serão cobertas pela T2.15 (CA-2-010 — auditoria de alterações e exceções da qualificação), que é a task proprietária desse recorte na SPEC-2-002.
