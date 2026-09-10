# Evidência — T2.06 — CA-2-001 (GREEN)

- **Data:** 2026-09-10
- **Versões:** 0.0.122–0.0.129 (QA verde)
- **Teste humano:** pendente (portão atual)

## Alterações

- **Secrets** `ADMIN_INITIAL_PASSWORD` e `OPERATOR_INITIAL_PASSWORD` definidos no ambiente Skip (valores nunca em código).
- `pocketbase/migrations/0028_t206_ca2001_rotacao_senhas.js` — rotação: senhas lidas de `$secrets.get`; secret ausente/curto → migration **falha sem criar conta parcial**.
- `pocketbase/hooks/credential_scan.js` — saneamento de snapshots via **model hooks** (`onRecordCreate/Update` na `auditoria`): campos sensíveis (password, token, secret, key...) viram `[REDACTED]` antes de persistir.
- `pocketbase/hooks/credential_scan_route.js` — **busca automatizada** `GET /backend/v1/security/credential-scan` (admin-only): varre todos os snapshots procurando campo sensível com valor utilizável ou valor com formato de credencial (sk-..., ghp\_..., AKIA..., PEM); retorna `{varridos, achados, detalhes}`.
- `src/pages/Index.tsx` — botão de demonstração preenche **só o e-mail**; senha nunca é preenchida.
- `pocketbase/migrations/0029/0030` — limpeza das fixtures da prova.

## Provas por API (v0.0.129)

| Prova                                      | Resultado                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Senha antiga `Skip@Pass` (admin)           | ✅ **rejeitada**                                                          |
| Senha antiga `Operator@2026`               | ✅ **rejeitada**                                                          |
| Nova senha do secret (admin)               | ✅ aceita                                                                 |
| Nova senha do secret (operator)            | ✅ aceita                                                                 |
| **Busca automatizada**                     | ✅ **57 varridos, achados: 0**                                            |
| Varredura com operator                     | ✅ 403                                                                    |
| Varredura sem auth                         | ✅ 401                                                                    |
| Saneamento (snapshot com password/api_key) | ✅ gravado como `"[REDACTED]"` (prova com rota de debug, depois removida) |
| Varredura pós-fixture com senha            | ✅ achados 0 — `[REDACTED]` não é utilizável                              |
| Fixtures de teste                          | ✅ 0 restantes                                                            |
| Regressão                                  | ✅ auditoria continua gravando; QA verde                                  |

## Defeitos encontrados e corrigidos

1. **Função top-level em callback** (JSVM) — detectada pelo QA do Skip na primeira aplicação; corrigido com lógica inline.
2. **Request hooks não disparam para saves internos** — o saneamento via `onRecordCreateRequest` não agia porque a auditoria é gravada via `$app.save()` (contexto sistema). Corrigido com **model hooks** (`onRecordCreate/Update`), que disparam em qualquer save. Prova: snapshot com `password: "SuperSenha123"` foi gravado cru na 1ª tentativa e como `[REDACTED]` na 2ª.
3. **Rota de debug com convergência lenta no pod** — removida (404 confirmado nas chamadas seguintes não foram necessárias; fixtures limpas por migration).

## Nota para a cliente

As senhas antigas (`Skip@Pass` / `Operator@2026`) estão **obsoletas** — circulavam em código e conversas de teste. As novas são definidas pelos secrets do ambiente e não transitam em código, chat ou documento. Guarde-as em gerenciador de senhas.

## Regressão

- Auditoria continua gravando eventos (último: clientes/create); exportação, eventos e empresas intactos; QA 0.0.122–0.0.129 verde.
