# Evidência — T2.04 — CA-2-039 (GREEN)

- **Data:** 2026-09-10
- **Versões:** 0.0.101–0.0.111 (QA verde em todas)
- **Teste humano:** pendente (portão atual)

## Alterações

- `pocketbase/migrations/0025_t204_ca2039_exportacoes_trilha.js` — coleção `exportacoes` append-only (create/update/delete **null** pela API): usuário, entidade, filtros, quantidade recalculada, aceite_id, csv_gerado, ocorrido_em.
- `pocketbase/hooks/export_endpoint.js` — rota `GET /backend/v1/export/{entidade}` ($apis.requireAuth): saneia filtros, **recalcula a quantidade no servidor**, valida aceite (mesmo usuário, mesma entidade, uso único), gera CSV com neutralização OWASP (=, +, -, @) e registra trilha append-only. Falha de trilha → 500, arquivo não entregue.
- `src/pages/SearchPage.tsx` — exportação via `pb.send` ao endpoint server-side; CSV baixado vem do servidor; toast exibe a quantidade recalculada.

## Provas por API (v0.0.111)

| Prova                          | Resultado                                                            |
| ------------------------------ | -------------------------------------------------------------------- |
| Endpoint sem aceite            | ✅ **403** "Aceite de exportação obrigatório."                       |
| Aceite inexistente             | ✅ **403**                                                           |
| Sem autenticação               | ✅ **401**                                                           |
| Entidade inválida (`usuarios`) | ✅ **400**                                                           |
| Aceite de outra entidade       | ✅ **403**                                                           |
| Aceite válido → exportação     | ✅ **200** + CSV com nomes de empresa resolvidos, BOM, neutralização |
| **Reuso do mesmo aceite**      | ✅ **403** "Aceite já consumido" (uso único provado)                 |
| Criação direta na trilha       | ✅ **403** (createRule null)                                         |
| Quantidade recalculada         | ✅ trilha registra 8 (server-side), não o que o cliente declara      |

## Prova de UI (ponta a ponta, v0.0.103)

- Exportação pela tela `/busca` com aceite: CSV baixado (`clientes-2026-09-10.csv`, 18:15:58) idêntico em timestamp à trilha server-side — arquivo veio do endpoint autorizado.

## Defeitos encontrados e corrigidos durante o GREEN

1. **findFirstRecordByFilter não aceita sort no JSVM** (params viram dbx.Params) — a validação de uso único pegava o consumo mais antigo e deixava reusar aceite. Corrigido com `findRecordsByFilter(sort: '-ocorrido_em', limit 1)` + comparação por epoch (Date.parse). Reprovado: reuso → 403.
2. **Rota de debug** criada para diagnóstico e removida (v0.0.111, 404 confirmado).

## Nota honesta de escopo

A leitura via API do PocketBase (usada pelas próprias telas do CRM) continua possível para usuários autenticados — inerente ao produto. O que a T2.04 fecha: **nenhum arquivo de dados pessoais é gerado fora do endpoint autorizado**, que exige aceite válido de uso único, recalcula filtros/quantidade no servidor e registra trilha imutável.

## Regressão

- Fluxo T2.03 intacto (eventos cancelado/negado/falha); aceites de exportação (T12.1) seguem sendo criados; QA 0.0.101–0.0.111 verde.
