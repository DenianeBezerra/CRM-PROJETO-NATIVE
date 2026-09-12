# AP-2026-09-13-1006 — Leitura de header HTTP em request hook JSVM

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T3.07 / SPEC-3-006
- Sinal: rate limit do formulário de entrada dependia do IP do remetente; `e.realIp()` retornou vazio atrás do proxy do preview e `e.request.getHeader('X-Forwarded-For')` não existe no JSVM — a falha passou silenciosa pelo try/catch e a regra virou fail-open sem ninguém perceber (2 iterações de prova por API até isolar a causa).
- Evidência: evidencias/spec-3-006/ca-3-018-020-provas.md (G4 — 429 no 4º envio após fix v0.0.450); changelog 0.0.449–0.0.451.
- Regra reutilizável: em request hooks JSVM, header HTTP lê-se com `e.request.header.get('Nome-Do-Header')` (não `getHeader`, não `e.realIp` atrás de proxy); qualquer acesso a metadados da requisição (header, query, IP) usado em regra de segurança deve ser provado por API antes de depender dele.
- Quando aplicar: hooks JSVM que usam IP, header ou query para decisão de segurança/roteamento.
- Quando não aplicar: contexto sem proxy reverso (e.realIp pode funcionar) ou lógica que não depende de metadados da requisição.
- Confiança: alta — provada por 429 no 4º envio após o fix, com RED anterior documentado.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
