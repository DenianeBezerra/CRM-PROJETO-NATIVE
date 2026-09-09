# Debug Summary — T8.1 — atomicidade da migração

- **Task e problema:** T8.1; a primeira implementação migrava oportunidades antes da confirmação final da atualização da etapa e não usava transação explícita.
- **Reprodução:** revisão técnica do hook `stage_migration.js`; a sequência de `$app.save(deal)` ocorria fora de transação comprovada.
- **Causa raiz:** operações de leitura, atualização das oportunidades, atualização da etapa e auditoria não estavam encapsuladas em `$app.runInTransaction`.
- **Correção:** substituição do hook para usar `$app.runInTransaction((txApp) => { ... })`, usando apenas `txApp` internamente; falhas lançadas no callback abortam a transação.
- **Verificação automática:** QA v0.0.68 verde — setup, análise estática, build, integrações e testes passaram.
- **Gate atual:** aguardando teste humano específico de falha/rollback.
