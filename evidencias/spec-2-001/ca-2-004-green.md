# Evidência — T2.09 — CA-2-004 (GREEN)

- **Data:** 2026-09-10
- **Versões:** 0.0.143–0.0.149 (QA verde no estado final)
- **Teste humano:** pendente (portão atual)

## Alterações

- `pocketbase/migrations/0032_t209_ca2004_rotacao_reforcada.js` — rotação reforçada:
  1. **Validação antes de qualquer alteração** — secret ausente/curto interrompe o provisionamento (sem conta parcial).
  2. **Rejeição de valor exposto** — senha igual a `Skip@Pass`/`Operator@2026` (historicamente expostas) → falha explícita.
  3. **Atomicidade** — as duas rotações em `runInTransaction`; idempotente (senha já no estado de destino = no-op, o que permitiu aplicar a migration sobre o estado da 0028 sem erro).

## Provas por API

| Prova                                               | Resultado                                                                                |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Rotação com valor IGUAL ao atual → rejeitada        | ✅ provado ("Rotação do admin exige valor diferente da senha atual — nada foi alterado") |
| Migration 0032 aplicada sobre estado já rotacionado | ✅ no-op idempotente, QA verde                                                           |
| Senhas expostas (`Skip@Pass`) rejeitadas no login   | ✅                                                                                       |
| Admin e operator com senhas dos secrets             | ✅                                                                                       |
| Varredura de credenciais (regressão T2.06)          | ✅ achados 0                                                                             |

## ⚠️ Incidente durante as provas — documentado com transparência

A rota de debug criada para provar a atomicidade tinha um bug (usava o secret do **admin** na rotação do **operator**) e o `runInTransaction` do JSVM **não reverte `setPassword`** (hash fora do controle transacional observável). Resultado: durante as provas, admin e operator ficaram temporariamente com senhas incorretas — **restaurados imediatamente** para os valores dos secrets, verificados por login, e estáveis por 30+ segundos após a remoção definitiva da rota (404 confirmado).

**Lição registrada** (`06_notas/aprendizado-continuo/AP-2026-09-10-t209-transacao-senhas.md`): nunca provar rotação de senhas com rota de debug que executa `setPassword` real — o padrão correto é provar a LÓGICA em suíte de testes (vitest) e a migration em ambiente descartável.

**Recomendação à cliente**: as senhas atuais circularam durante o incidente de prova. Recomendo rotação nova assim que a T2.10 fechar a SPEC-2-001 — basta definir novos valores nos secrets e reimplantar (a migration 0032 aplica automaticamente).

## Regressão

- Admin/operator autenticam; varredura de credenciais zero; QA verde no estado final.
