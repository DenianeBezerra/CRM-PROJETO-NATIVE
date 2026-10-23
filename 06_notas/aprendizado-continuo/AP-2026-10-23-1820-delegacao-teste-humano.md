# AP-2026-10-23-1820 — Delegação expressa de teste humano + conclusão em sequência

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: SPEC-3-025 / T3.25
- Sinal: a CEO delegou explicitamente ("SIM, EXECUTE") a execução do roteiro de teste humano pela Deni.Ai com conclusão em sequência; o roteiro objetivo da SPEC (6 passos binários) permitiu execução na UI + revalidação por API sem ambiguidade de critério.
- Evidência: screenshots do preview (vazio/0 bloqueados, badge legado, 2,25 salvo) + provas API (PATCH desativar 200 / reativar 400 / corrigir 200; regressão 6 metas intactas; fixtures removidas 204/204).
- Regra reutilizável: quando a CEO delega teste+conclusão, executar o roteiro da SPEC na UI E reexecutar as provas por API antes de fechar; nunca concluir só com evidência de UI.
- Quando aplicar: tasks com roteiro de teste objetivo e provas API reexecutáveis.
- Quando não aplicar: teste que exige percepção do negócio (conteúdo, tom, dados reais do cliente) — aí o teste humano é da CEO.
- Confiança: alta — padrão já usado em T3.21/T3.24 e reprovado aqui.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
