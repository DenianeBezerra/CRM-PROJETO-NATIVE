# AP-2026-09-12-0915 — PATCH admin direto em handoff é bloqueado por regra; estado final exige migration

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T2.33 / CA-2-028 (SPEC-2-006)
- Sinal: na revalidação independente, a prova GREEN1 (devolução) deixou o handoff real em `devolvido`; tentativa de restaurar via `PATCH /api/collections/handoffs/{id}` com token admin retornou 403 — o hook de regras do handoff rejeita transição direta fora do endpoint de decisão. O estado final só pôde ser restaurado por migration (0093), padrão já usado em 0083–0089 e 0092.
- Evidência: revalidação da T2.33 (2026-09-12) — PATCH 403; migration 0093 aplicada com QA v0.0.322/0.0.323 verde e handoff confirmado `pendente` por API.
- Regra reutilizável: para resetar estado de registros protegidos por hooks de negócio, não usar PATCH admin direto — criar migration de estado final (idempotente, com try/catch) e prová-la por API após o deploy.
- Quando aplicar: qualquer limpeza pós-prova de registro governado por hooks (handoffs, propostas, qualificação, oportunidades).
- Quando não aplicar: registros sem regra server-side, onde PATCH admin resolve com menos custo.
- Confiança: alta — comportamento observado duas vezes (0092 e 0093) com QA verde.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
