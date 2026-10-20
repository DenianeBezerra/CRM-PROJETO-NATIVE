# Estado atual — Adapta Cliente

- task_id: T3.23 (RBAC completo — 5 perfis + gestão de usuários)
- champion: Deni.Ai
- spec: 04-fase-atual/specs/SPEC-3-023-rbac-perfis-gestao-usuarios.md
- etapa: aguardando_teste_humano
- autorizacao_implementacao: confirmada — 19/10, owner: "Pode implementar a T3.23 (RBAC)"
- teste_humano: pendente — CEO valida a tela /config/usuarios e o menu por perfil (usuário de prova "Prova T323" analista fica INATIVO na base; reativar antes de usar)
- verificacao_automatica: passou — v0.0.700 QA verde; provas por API: /rbac/minhas admin (12/12, diretoria) e analista (menu.comercial=false, menu.operacao=true); /usuarios listar 200 (14 usuários) e 403 como analista (CA-3-135); criar usuário com senha 1x (CA-3-134); desativar → refresh 400 (CA-3-136); reativar → login 200; **alterar perfil provado** (PATCH analista→comercial muda matriz ao vivo; guard anti-autodemissão 400); **exceção de permissão provada (CA-3-133, migrations 0215/0216)** — exceção menu.comercial=true sobrescreveu default do analista e foi removida na limpeza; **render UI /config/usuarios CONFIRMADO no navegador real** (login pela UI; 14 usuários; evidência artifacts/T323_config_usuarios_render_1910.png); **DEBUG reset-senha**: defeito real provado RED (reset gravava tokens_invalidos_apos no passado → login com senha nova = 400, usuário travado) → fix v0.0.697/0.0.698 (reset limpa o campo; troca de senha já derruba sessões via tokenKey) → GREEN (reativar→reset→login 200); regressão: base só AG + Felicidade
- aprendizado: capturado — JSVM: helpers/const top-level NÃO visíveis nos callbacks (tudo inline); campo de revogação nunca gravado no passado por ação que devolve credencial nova
- ultima_acao: 19/10 21:35 — provas restantes concluídas + debug reset-senha + governança Skip v0.0.700
- pendencias: (1) CEO valida tela /config/usuarios e menu por perfil (portão atual); (2) tipos 2/3 do importador na sequência (nova autorização); (3) modo lote da agenda (T3.21) NÃO VERIFICADO pela CEO; (4) Visão 3 e quadro anual (depois do importador)
- proxima_acao: teste humano da CEO na tela /config/usuarios; aprovado → concluir-task + sync GitHub
- atualizado_em: 2026-10-19T21:35:00-03:00