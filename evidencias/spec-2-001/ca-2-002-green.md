# Evidência — T2.07 — CA-2-002 (GREEN)

- **Data:** 2026-09-10
- **Versões:** 0.0.132–0.0.137 (QA verde)
- **Teste humano:** pendente (portão atual)

## Alterações

- `pocketbase/hooks/auth_active_guard.js` — `onRecordAuthWithPasswordRequest` + `onRecordAuthRefreshRequest` na coleção `users`: se `active=false`, a autenticação **falha server-side** com mensagem genérica ("Falha ao autenticar.", idêntica à de credenciais inválidas — o hook roda antes da validação da senha, e mensagem específica permitiria enumerar e-mails com conta).
- `pocketbase/migrations/0031_t207_limpeza_fixture_inativa.js` — limpeza da fixture de teste.

## Provas por API (v0.0.137)

| Prova                                                                                   | Resultado                                                                |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Conta inativa → login                                                                   | ✅ **bloqueado** ("Falha ao autenticar.")                                |
| Conta inativa → token                                                                   | ✅ nenhum token emitido                                                  |
| Ciclo completo: criar inativa → bloqueada → reativar → **aceita** → remover → bloqueada | ✅ provado (rota de debug em contexto sistema, depois removida)          |
| Mensagem não vaza existência de conta                                                   | ✅ senha errada em conta inativa responde o mesmo "Falha ao autenticar." |
| Regressão: admin loga                                                                   | ✅                                                                       |
| Regressão: operator loga                                                                | ✅                                                                       |
| Frontend sem preenchimento de senha                                                     | ✅ (T2.06)                                                               |
| Fixture de teste                                                                        | ✅ removida                                                              |

## Defeitos encontrados e corrigidos

1. **Vazamento de enumeração de usuários** — a 1ª versão usava mensagem "Conta inativa. Procure o administrador.", que revelava a existência da conta mesmo com senha errada (o hook roda antes da checagem de senha). Corrigido para mensagem genérica idêntica à falha de credenciais.
2. **Padrão crítico de auth hooks (guia Skip §3.2)** — rejeitar login com `throw` (nunca `return` seco, que responderia 200 vazio a TODOS os logins e derrubaria o acesso à instância). Seguido à risca.

## Regressão

- Admin e operator (ativos) autenticam normalmente; QA 0.0.132–0.0.137 verde; nenhum outro fluxo afetado.
