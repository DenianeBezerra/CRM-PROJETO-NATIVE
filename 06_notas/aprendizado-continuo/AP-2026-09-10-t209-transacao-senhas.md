# AP-2026-09-10 — runInTransaction não reverta setPassword no JSVM

- **Task:** T2.09 (CA-2-004)
- **Descoberta:** `$app.runInTransaction` no JSVM não reverte mudanças de senha — `setPassword` hasheia fora do controle transacional observável; a senha alterada persiste mesmo após o throw que aborta a transação.
- **Incidente:** rota de debug criada para provar atomicidade tinha bug adicional (usava o secret do admin na rotação do operator) e executou múltiplas vezes devido à convergência lenta do pod (rota removida continuava respondendo). Admin e operator ficaram temporariamente com senhas incorretas; restaurados manualmente via `PATCH` com `oldPassword` + login com a senha temporária conhecida.
- **Regras extraídas:**
  1. NUNCA provar rotação de senhas com rota de debug que executa `setPassword` real — provar a LÓGICA em suíte vitest (réplicas) e a migration em ambiente descartável.
  2. Para atomicidade real de senhas, usar compensação manual (reverter a 1ª alteração se a 2ª falhar), não confiar em `runInTransaction`.
  3. Rota de debug com efeitos colaterais persistentes (senha, dados) é proibida — só leitura ou fixtures auto-limpas.
  4. Convergência de pod pode executar rotas removidas várias vezes — cada chamada reexecuta a lógica; nunca assumir que a remoção foi imediata.
- **Correção aplicada:** migration 0032 com validação prévia + rejeição de expostos + idempotência; incidente documentado na evidência GREEN com recomendação de rotação nova.
