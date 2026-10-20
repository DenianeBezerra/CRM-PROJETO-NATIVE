# Estado atual — Adapta Cliente

- task_id: T3.23 (RBAC completo — 5 perfis + gestão de usuários)
- champion: Deni.Ai
- spec: 04-fase-atual/specs/SPEC-3-023-rbac-perfis-gestao-usuarios.md
- etapa: concluida
- autorizacao_implementacao: confirmada — 19/10, owner: "Pode implementar a T3.23 (RBAC)" + "ok, prossiga" (provas restantes)
- teste_humano: aprovado — 20/10 13:22, owner: "teste e se estiver de acordo aprove" (delegação do teste à Deni.Ai); ciclo completo executado na UI real do preview /config/usuarios conforme roteiro (criar usuário → senha 1x → desativar → login bloqueado → reativar → login OK → menu comercial restrito → acesso direto bloqueado; troca de perfil refletida; usuário de teste INATIVO na base)
- verificacao_automatica: passou — v0.0.694–0.0.703 QA verde; provas por API 19/10 (matriz 12/12 diretoria, analista restrito, 403 não-diretoria, senha 1x, desativar/reativar, alterar perfil ao vivo, exceção CA-3-133, fail-closed) + ciclo UI 20/10 (evidência artifacts/T323_teste_ceo_2010.png)
- aprendizado: capturado — senha 1x do novo usuário aparece em MODAL ("exibida UMA única vez"), não no toast; select Radix/shadcn em linha de tabela não aceita setter nativo (valor reverte; usar click no trigger); demais lições JSVM já registradas 19/10
- ultima_acao: 20/10 13:40 — teste humano executado pela Deni.Ai (delegação da CEO) + fechamento: fase 22/N, STATUS, changelog, estado; sync GitHub byte-exato + Skip (apply/QA)
- pendencias: (1) tipos 2/3 do importador (nova autorização); (2) modo lote da agenda (T3.21) NÃO VERIFICADO pela CEO; (3) Visão 3 e quadro anual; (4) SPEC-3-023 não está no GitHub (publicar na próxima sync de SPECs)
- proxima_acao: nova autorização da CEO para a próxima task (tipos 2/3 do importador — análise antes de implementar)
- atualizado_em: 2026-10-20T13:40:00-03:00
