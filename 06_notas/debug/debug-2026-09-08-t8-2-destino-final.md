# Debug Summary — T8.2 — estado final como destino de migração

- **Task e problema:** T8.2; o modal de migração oferecia "Fechado perdido"/"Fechado ganho" como destino, o que marcaria oportunidades como perdidas sem motivo estruturado.
- **Reprodução:** captura da cliente mostrando "Fechado perdido" no dropdown de destino.
- **Causa raiz:** filtro do modal considerava apenas `ativa` e `id diferente`, sem excluir estados finais; backend também não rejeitava.
- **Correção:** frontend filtra `fechado_ganho`/`fechado_perdido` do dropdown; backend rejeita destino final com erro explícito.
- **Verificação automática:** QA v0.0.71 verde — setup, análise estática, build, integrações e testes.
- **Gate atual:** aguardando teste humano.
