# Evidência — T2.12 — CA-2-007 (RED)

- **Data:** 2026-09-10
- **Versões:** 0.0.167–0.0.175

## Falhas reproduzidas antes do comportamento correto (provas por API)

| Tentativa                     | Entrada                                  | Resultado                                                             |
| ----------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| Número obrigatório vazio      | `pergunta` válida, sem `resposta_numero` | ✅ 400 — request hook valida corpo cru (model hook vê 0 = zero value) |
| Pergunta inativa              | `pergunta` com ativa=false               | ✅ 400 — "Pergunta inativa"                                           |
| Duplicidade                   | mesmo par negocio+pergunta               | ✅ 400 — "já foi respondida"                                          |
| Completude antes de responder | endpoint de leitura                      | ✅ percentual 0, pendência obrigatória listada                        |

## Defeitos encontrados e corrigidos durante a task

1. **Sort inexistente no endpoint** (`updated` → `respondido_em`) — v0.0.168.
2. **Índice UNIQUE composto sobre relations derruba todo INSERT** com 400 genérico — substituído por índice simples + unicidade no hook (v0.0.170).
3. **`set()` manual em campo autodate gera 400 genérico** — respondido_em é autodate e se preenche sozinho (v0.0.173).
4. **Bind params `{:x}` no findRecordsByFilter falha neste JSVM** — substituído por interpolação direta de IDs (v0.0.174).
5. **Número ausente vira 0 no model hook (zero value)** — validação de número obrigatório movida para request hook que lê o corpo cru (v0.0.175).
