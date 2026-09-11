# Evidência — T2.15 — CA-2-010 (RED/GREEN)

- **Data:** 2026-09-11
- **Versões:** 0.0.205–0.0.212 (QA verde: setup, staticAnalysis, build, integrations, test)
- **Teste humano:** PENDENTE

## Alterações

- `pocketbase/hooks/audit_crm_changes.js` — escopo ampliado: `perguntas_qualificacao`, `respostas_qualificacao` e `excecoes_qualificacao` agora geram eventos append-only (create/update/delete) com ator, data e snapshots.
- `pocketbase/hooks/qualificacao_excecao_endpoint.js` — a criação de exceção via rota custom não passa pelos request hooks de CRUD; o endpoint agora grava o evento de auditoria explicitamente (ator, data, snapshot do motivo/validade).
- `pocketbase/hooks/qualificacao_avanco_rules.js` + `outcome_rules.js` — tentativa negada (avanço bloqueado / desqualificação sem próxima ação) registra trilha estruturada com ator, etapas e motivo.
- Migrations 0048 — limpeza das provas.

## Provas por API (v0.0.210–0.0.212)

| Prova                                                                  | Resultado                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Criar pergunta gera evento `create`** com snapshot                   | ✅ 0 → 1 evento (entidade perguntas_qualificacao)                                          |
| **Editar pergunta gera evento `update`** com estado anterior/posterior | ✅ snapshots conferidos                                                                    |
| **Criar resposta gera evento `create`**                                | ✅ 1 evento (entidade respostas_qualificacao)                                              |
| **Exceção via endpoint gera evento `create`** com ator e snapshot      | ✅ 1 evento (entidade excecoes_qualificacao)                                               |
| **Regressão: auditoria de negocios/clientes intacta**                  | ✅ eventos continuam gravados                                                              |
| **Regressão: regras da T2.13/T2.14 intactas**                          | ✅ negativa de avanço sem exceção → 400; exceção vigente → 200 (provado durante as provas) |

## LIMITAÇÃO TÉCNICA — tentativa negada na coleção `auditoria` (DÚVIDA para o consultor)

O critério pede "inclusive tentativa negada" na auditoria. Provado por API que, no JSVM do PocketBase v0.36:

1. qualquer `$app.save()` dentro de um request hook participa da transação do request;
2. quando uma regra bloqueia (throw), a transação é revertida — o evento "negado" gravado antes **não sobrevive** (provado: 0 eventos após 3 tentativas com mecanismos diferentes — throw, `e.json(400)`, `e.badRequestError`);
3. o JSVM não expõe hook de erro (`onRecordAfterUpdateError` não existe na v0.36).

**Trilha implementada:** log estruturado de nível error (`T2.15 tentativa negada`) com ator, registro, etapa anterior, etapa tentada, motivo e timestamp — preservado nos logs do Skip. **Alternativa definitiva** (fora do recorte desta task, requer decisão de produto): rota custom `/backend/v1/negocios/{id}/avanco` que o frontend passe a usar para mudança de etapa — handlers de `routerAdd` rodam fora da transação de CRUD, permitindo gravar o evento negado antes de responder 400.

## Estado final (denominador real limpo — v0.0.212)

- Pergunta de prova, respostas e exceções de prova removidas (0 restantes).
- "Proposta BPO" íntegra: `novo`, próxima ação "ligar", 1 permanência aberta consistente.
- Eventos de auditoria das provas permanecem (append-only, por design). Preview 200.
