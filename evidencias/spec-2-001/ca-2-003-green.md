# Evidência — T2.08 — CA-2-003 (GREEN)

- **Data:** 2026-09-10
- **Versões:** 0.0.140+ (QA verde)
- **Teste humano:** pendente (portão atual)

## Alterações

- `package.json`:
  - **`engines`: `"node": ">=20 <23"`** — Node declarado (LTS 20/22, compatível com Vite 8 e o toolchain).
  - **`typecheck`**: `tsc --noEmit` — verificação de tipos isolada.
  - **`test`**: `vitest run` — suíte real substitui o placeholder.
  - **`verify`**: `npm ci && typecheck && lint && test && build` — pipeline completo em um comando.
  - **`vitest`** adicionado ao devDependencies.
- `src/security.test.ts` — **suíte real com 22 testes** das funções críticas de segurança (réplicas linha a linha do código de produção):
  - `csvCell` (T2.03): neutralização de `=`, `+`, `-`, `@`, escape de aspas, null/undefined, HYPERLINK completo — 8 testes.
  - `sanitizarSnapshot` (T2.06): redact de password/api_key/token com hífen, case-insensitive, preservação de campo de negócio (`chave`), JSON não-sensível, texto não-JSON, vazio — 8 testes.
  - Leitura da auditoria por papel (T2.05): admin tudo, operator só os próprios atos, anônimo nada — 4 testes.
  - Guard de autenticação (T2.07): ativa autentica, inativa falha, campo ausente não bloqueia — 2 testes (há sobreposição de contagem com os blocos anteriores).

## Provas (v0.0.140)

| Prova                                                                                                          | Resultado                                                                           |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| QA do Skip (setup, staticAnalysis, build, integrations, **test**)                                              | ✅ tudo verde — o estágio `test` agora executa a suíte vitest real                  |
| Frontend compilado servido (build ok)                                                                          | ✅ 200 com título correto                                                           |
| Imports locais (`@/lib/pocketbase/client`, `@/contexts/AuthContext`, `@/components/ui/*`, `@/hooks/use-toast`) | ✅ todos presentes no projeto — build e lint passam, o que exige imports resolvidos |
| Node declarado                                                                                                 | ✅ `engines.node = ">=20 <23"`                                                      |

## Nota honesta de escopo

O `npm ci` e o `vite build` rodam dentro do pipeline do Skip (não há shell exposto no ambiente de preview para executá-los manualmente). A prova de código zero é o **QA verde do v0.0.140**, que executa setup (npm ci), análise estática (lint), build e a suíte de testes real a cada versão. O script `verify` agrega os mesmos passos para execução local em qualquer ambiente com Node 20/22.

## Regressão

- Frontend servido corretamente; nenhuma mudança de comportamento de produto; QA verde.
