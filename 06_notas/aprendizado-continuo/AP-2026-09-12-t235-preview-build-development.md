# AP-2026-09-12-0940 — Preview do Skip só atualiza com build development

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T2.35 / CA-2-030 (SPEC-2-006)
- Sinal: aplicar mudanças de frontend em modo `production` não atualiza o preview (`*.goskip.app` com sufixo `--preview`) — o modal Consulta 360º continuou servindo o build antigo após v0.0.331–0.0.334 (todas production). Rebuild em modo `development` (v0.0.335) atualizou o preview imediatamente. Produção (`tela-de-login-crm-a400a.goskip.app`) só recebe build production.
- Evidência: teste humano da T2.35 — card Handoff ausente no preview com deploys production; visível após deploy development (v0.0.335).
- Regra reutilizável: para teste humano via preview, SEMPRE aplicar em modo `development`; usar `production` apenas para o build de publicação (que aguarda decisão da cliente).
- Quando aplicar: qualquer task com mudança de frontend (src/) que será testada no preview.
- Quando não aplicar: mudanças apenas de backend/hooks/migrations — QA e provas por API não dependem do preview.
- Confiança: alta — comportamento reproduzido duas vezes na mesma sessão (ausente → development → visível).
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
