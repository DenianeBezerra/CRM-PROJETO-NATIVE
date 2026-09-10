# AP-2026-09-10 — request hooks não disparam para saves internos ($app.save)

- **Task:** T2.06 (CA-2-001)
- **Sintoma:** hook de saneamento via `onRecordCreateRequest` na `auditoria` não agia — snapshots eram gravados com `password` cru.
- **Causa raiz:** request hooks (`onRecord*Request`) só disparam em requests HTTP. A auditoria é gravada pelos hooks de auditoria via `$app.save()` (contexto sistema, sem request) — o request hook nunca é chamado.
- **Correção:** usar **model hooks** (`onRecordCreate`/`onRecordUpdate`), que disparam em qualquer save, inclusive interno.
- **Regra:** para validar/transformar dados gravados por OUTROS hooks (que usam `$app.save`), sempre model hook. Request hook só para lógica dependente de contexto HTTP (e.auth, e.requestInfo).
- **Diagnóstico:** rota de debug que gravava evento com password e relia o que foi persistido — mostrou a senha crua com request hook e `[REDACTED]` com model hook.
- **Extra:** rota de debug teve convergência lenta no pod (continuou respondendo 200 após remoção); não insistir em chamadas — cada chamada reexecuta a lógica. Limpar efeitos colaterais por migration e aguardar convergência.
