# T2.29 — CA-2-024 — Provas RED/GREEN (2026-09-11)

**Critério (fase.md):** pausa, reabertura, usuário inativo e duas atualizações concorrentes preservam consistência e auditoria.

**Implementação (v0.0.279, QA 5/5 verde):**

- Migration 0071 — campos `motivo_pausa` (text) e `versao_registro` (int) em `negocios`, com backfill versão 1.
- Hook `negocio_ciclo_rules.js` (request hooks create+update):
  1. **Pausa estruturada** — status → `pausado` exige `motivo_pausa` ≥ 10 chars; pausa não coexiste com etapa final;
  2. **Reabertura auditável** — sair de `pausado` exige `justificativa_reabertura` ≥ 10 chars; não pode apontar direto para status final;
  3. **Usuário inativo** — responsável inativo rejeitado em qualquer transição (estende guard T2.19 para pausa/reabertura);
  4. **Concorrência otimista** — `versao_registro` incrementado server-side; update com versão divergente é rejeitado (409 lógico).

## Provas RED

| #   | Prova                                     | Resultado              |
| --- | ----------------------------------------- | ---------------------- |
| R1  | Pausar sem motivo                         | ✅ HTTP 400            |
| R2  | Pausar com motivo curto ("curto")         | ✅ HTTP 400            |
| R3  | Update com `versao_registro: 999` (stale) | ✅ HTTP 400 (conflito) |
| R4  | Pausar com responsável inativo            | ✅ HTTP 400            |
| R5  | Reabrir sem justificativa                 | ✅ HTTP 400            |

## Provas GREEN

| #   | Prova                                                                                                              | Resultado |
| --- | ------------------------------------------------------------------------------------------------------------------ | --------- |
| G1  | Pausa com motivo → status `pausado`, motivo gravado, versão 1→2                                                    | ✅        |
| G2  | Reabertura com justificativa → `em_aberto`, justificativa gravada, versão 2→3                                      | ✅        |
| G3  | Auditoria registra pausa e reabertura (eventos update com estado posterior)                                        | ✅        |
| G4  | Concorrência determinística: 1º update com v4 → 200; 2º update com v4 (stale) → 400; escrita vencedora preservada  | ✅        |
| G4b | 2 updates paralelos com mesma versão: exatamente 1 vence (auditoria mostra os 2 eventos, estado final consistente) | ✅        |
| G5  | Revalidação do denominador: negócio real íntegro (`em_aberto`, `novo`), sem pausa residual                         | ✅        |
| G6  | Reabertura completa com justificativa gravada e versão incrementada (10)                                           | ✅        |

## Descoberta de prova (diagnóstico registrado)

- `users.updateRule = null` (só superuser): **não é possível desativar um usuário via API do app** — a desativação real acontece pelo painel de superuser. A prova R4 exigiu criar a fixture **já inativa** (`active: false` na criação). O login de conta inativa segue bloqueado (guard T2.07 confirmado: "Falha ao autenticar").
- Na 1ª tentativa de R4 (fixture criada ativa, desativação falhou silenciosamente), a pausa passou — comportamento correto, pois o usuário estava ATIVO. Reprovado com fixture realmente inativa → 400.

## Limpeza

- Migration 0072 remove as 2 fixtures de usuário (findAuthRecordByEmail).
- Estado final: 0 fixtures, negócio real íntegro em `em_aberto`/`novo`, versão_registro 10.
