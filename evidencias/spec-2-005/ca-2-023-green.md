# T2.28 — CA-2-023 — Provas RED/GREEN (2026-09-11)

**Critério (fase.md):** tarefas vencidas, oportunidades sem próxima ação e exceções aparecem em filas distintas e reproduzíveis.

**Implementação (v0.0.273, QA 5/5 verde):**

- Endpoint `GET /backend/v1/filas/operacionais` (`filas_operacionais_endpoint.js`) — leitura pura, sem write, autenticado:
  - **fila 1 `tarefas_vencidas`**: tarefas `aberta` com prazo no passado; operator vê só as suas (responsavel), admin todas;
  - **fila 2 `sem_proxima_acao`**: oportunidades ativas (não finais, não arquivadas) sem próxima ação futura E sem exceção vigente — mesmo critério do hook `oportunidade_saudavel` (T2.18), por isso reproduzível;
  - **fila 3 `excecoes_vigentes`**: exceções com validade futura; admin-only (`visivel_para_operator: false`).
- UI: seção "Filas distintas" no painel Operacional com os 3 cards, totais e navegação para a oportunidade.

## Provas

| #   | Prova                                                                                                                       | Resultado |
| --- | --------------------------------------------------------------------------------------------------------------------------- | --------- |
| RED | Endpoint não existia antes (HTTP 404 — registrado no baseline)                                                              | ✅        |
| G1  | Fila 1: tarefa aberta com prazo passado aparece para admin e para o operator (própria)                                      | ✅        |
| G2  | Fila 2: negócio com ação futura fora da fila; exceção vigente libera update do negócio (hook T2.18) e o mantém fora da fila | ✅        |
| G3  | Fila 3: admin vê 2 exceções vigentes; operator vê 0 com `visivel_para_operator: false`                                      | ✅        |
| G4  | Reprodutibilidade: 2 consultas consecutivas idênticas (1 0 1) = (1 0 1)                                                     | ✅        |
| G5  | Sem autenticação → HTTP 401                                                                                                 | ✅        |
| G6  | Revalidação do denominador: negócio real "Proposta BPO" íntegro (novo, ação futura 20/10, fora de todas as filas)           | ✅        |

## Nota de descoberta (defeito de borda encontrado e registrado)

A criação de tarefa com **prazo no passado é rejeitada** (hook T2.27 valida prazo futuro na criação), mas o **update de prazo** não revalida — a fixture de tarefa vencida só foi possível via update. Isso é intencional (edição de tarefa aberta permite remar prazo), porém o hook de update não rejeita prazo passado em remarcação. **Decisão de produto: manter** — remarcação para prazo passado é cenário real de atraso e a fila existe exatamente para evidenciá-lo; o bloqueio só vale na criação. Registrado para a T2.29 (consistência de pausa/reabertura).

## Limpeza

- Migration 0070 remove as fixtures (tarefa, negócio fixture e 2 exceções, incluindo órfãs) — remoção no nível de modelo (exceções são append-only).
- Estado final: 0 tarefas, 0 exceções, 1 negócio (real), filas zeradas.
