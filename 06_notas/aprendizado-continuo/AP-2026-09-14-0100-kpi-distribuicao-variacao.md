# AP-2026-09-14-0100 — KPI de distribuição no painel: variacao_pct por soma de qtd

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: SPEC-3-018 (T3.18 — Painel por papel + metas editáveis)
- Sinal: KPIs de distribuição (objeto {chave: {qtd, valor}}) não cabem na variacao_pct original (que só aceita números). A variação foi calculada pela soma das quantidades (qtd) de cada distribuição, e a UI renderiza a distribuição em lista em vez de número formatado.
- Evidência: painel/direcao retorna 21 KPIs com variacao_pct não-nulo para distribuições (prova GREEN1 em evidencias/spec-3-018/ca-3-077-a-082.md); UI PainelDirecao.tsx com unidade 'distribuicao'.
- Regra reutilizável: ao acrescentar KPI agregado (objeto/distribuição) a um painel com comparativo de período, estender a função de variação para o tipo agregado (soma de qtd) e tratar a unidade na UI — não reutilizar a variação numérica escalar.
- Quando aplicar: qualquer painel com comparativo automático que ganhe KPI não-escalar.
- Quando não aplicar: KPIs escalares (número, moeda, percentual, dias) — manter a variação original.
- Confiança: alta — provado por API na base real (v0.0.563–0.0.564).
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
