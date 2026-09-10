# Evidência — T2.03 — CA-2-038 (GREEN)

- **Data:** 2026-09-10
- **Versão:** 0.0.97 (QA verde: setup, análise estática, build, integrações, testes)
- **Teste humano:** pendente (portão atual)

## Alterações

- `pocketbase/migrations/0024_t203_ca2038_eventos_exportacao.js` — coleção `eventos_exportacao` append-only (create autenticado; updateRule/deleteRule **null**): usuário (relation), entidade (clientes/negocios), evento (cancelado/negado/falha), filtros, quantidade, motivo, ocorrido_em.
- `pocketbase/hooks/export_events_guard.js` — validação server-side: ator = autenticado, evento/entidade em enum, quantidade inteira ≥ 0, falha exige motivo, data obrigatória; update/delete bloqueados.
- `src/pages/SearchPage.tsx` — `csvCell` neutraliza células iniciadas por `=`, `+`, `-`, `@` (prefixo `'`, padrão OWASP) além do escape de aspas; modal com três saídas rastreadas (Cancelar → `cancelado`, Não aceitar → `negado`, falha → `falha` com motivo).

## Provas por API (v0.0.97)

| Prova                              | Resultado                     |
| ---------------------------------- | ----------------------------- |
| Evento `cancelado` persiste        | ✅ 200 — id `l6ie96pcswy8wf9` |
| Evento `negado` persiste           | ✅ 200 — id `ayw0ejh1o9hfc0g` |
| Evento `falha` com motivo persiste | ✅ 200 — id `pd7gjlbl1o83zqt` |
| Update de evento bloqueado         | ✅ **403** (regra null)       |
| Delete de evento bloqueado         | ✅ **403** (regra null)       |
| Evento fora do enum bloqueado      | ✅ 400                        |
| `falha` sem motivo bloqueado       | ✅ 400 (hook)                 |

## Provas de UI (preview, usuário deniane@vibratto.com.br)

- Modal exibe os três botões: Cancelar / **Não aceitar** (novo) / Aceitar e exportar.
- Clique em **Cancelar** gerou evento append-only real: `cancelado | clientes | "Modal fechado sem aceite." | 2026-09-10 20:57:29Z`.

## Prova do arquivo final (CSV real baixado)

- Fixture criada com nome `=CMD T203 fixture` (payload de planilha).
- Exportação de contatos executada pela UI com aceite.
- Conteúdo real do `contatos-2026-09-10.csv` baixado:
  `"'=CMD T203 fixture";"";"";"";"";"outro";"prospect"` — célula **neutralizada** (prefixo `'`), fórmula não executaria no Excel/LibreOffice.
- Fixture removida após a prova (delete 204).

## Neutralização executável (cópia da função de produção)

`=CMD|'/C calc'!A0` → `"'=CMD|'/C calc'!A0"` ✅ · `+1+1` → `"'+"` ✅ · `-2+3` → `"'-2+3"` ✅ · `@SUM(1)` → `"'@SUM(1)"` ✅ · texto comum inalterado ✅

## Regressão

- Fluxo de aceite bem-sucedido preservado (aceite + download + toast), QA 0.0.97 verde em todas as fases.
- Aceites de exportação (T12.1) intactos.
