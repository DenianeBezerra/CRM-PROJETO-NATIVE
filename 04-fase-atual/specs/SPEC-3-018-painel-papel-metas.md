# SPEC-3-018 — T3.18 Painel por papel + metas editáveis (backlog Etapa 3 — camada analítica p.1)

**Origem:** documento da CEO "Requisitos complementares da etapa 3" (uploads/fe42b9d3 — §2.1 Painéis por papel, §2.2 Indicadores mínimos, §2.3 requisitos funcionais, §5 administração, tabela de priorização: "Painel de direção com os dez indicadores — Alto/Médio/Etapa 3") + decisão da CEO 13/09 23:42 ("fazer estas e logo mais volto com as chaves da API").
**Princípio:** cada papel enxerga um painel próprio ao entrar — não um painel único genérico. Todo número é comparado com o período anterior e tem meta com progresso visual. Nada de escrita comercial nos painéis (guard T2.18 intacto).

## O que existe hoje (estado real inspecionado)

- `painel_papel_endpoint.js` (T3.10): GET /painel/{papel} para direcao|comercial|controladoria|administracao + GET /metas (somente leitura). Direção já tem 12 KPIs em 4 grupos com comparativo de período e premissa MRR. **Faltam 6 dos 10 indicadores do backlog**: negócios em aberto por etapa (qtd+valor), taxa de conversão por etapa, ciclo médio de venda, origem dos negócios ganhos, motivo de perda, negócios parados.
- `metas_indicadores`: 3 metas seed da direção (novos_negocios_mensal, diagnosticos_semanal, horas_venda_semanal) — **sem endpoint de edição** (a CEO não consegue editar meta sem código).
- `dashboard_drilldown_export.js` (T2.40): drill-down por bloco + export CSV já existem para o dashboard comercial — padrão a reutilizar.
- `visao_coordenacao.js` (T3.15): matriz operacional por cliente — distinta dos painéis analíticos (não duplicar).
- UI: `/painel-direcao` (fixa no papel direcao — não há seletor de papel).
- Config: `configuracoes_operacionais` com 2 chaves (limite_oportunidade_parada_dias, limite_entrada_por_ip_hora).
- Última migration: 0183. Próxima: 0184.

## Recorte desta task

1. **Novos KPIs no painel de direção** (6 indicadores do §2.2 que faltam — fonte: negocios + permanencias, mesma base do T3.10):
   - `negocios_por_etapa` (qtd e valor por etapa ativa) — grupo Pipeline.
   - `taxa_conversao_por_etapa` (avanço entre etapas consecutivas no período, via permanencias_negocio) — grupo Pipeline.
   - `ciclo_medio_venda_dias` (entrada → fechamento, média dos ganhos do período) — grupo Financeiro.
   - `origem_ganhos` (distribuição por canal dos ganhos do período) — grupo Aquisição.
   - `motivo_perda` (distribuição estruturada das perdas do período) — grupo Pipeline.
   - `negocios_parados` (sem atividade registrada há mais de N dias — config `limite_oportunidade_parada_dias` já existente) — grupo Operação.
   - Cada KPI novo com comparativo automático de período (mesma regra do T3.10) e meta quando configurada.
2. **Metas editáveis pela CEO** (§2.3 — "definição de meta por indicador"):
   - `POST /backend/v1/metas` + `PATCH /backend/v1/metas/{id}` (admin-only): criar/editar/ativar-desativar meta por indicador (chave, papel, valor_meta, periodicidade, descricao). Auditado (acao `meta_configurada` — adicionar ao select da auditoria, migration).
   - UI de edição no Painel de Direção (bloco "Metas" admin-only): lista as metas ativas + formulário de criação/edição inline.
3. **Painel por papel na UI** (§2.1 — "cada papel enxerga um painel próprio"):
   - `/painel-direcao` passa a aceitar `?papel=` (direcao|comercial|controladoria) com seletor visual para admin; operator/comercial veem apenas o próprio papel (endpoint já valida).
   - Home: card do painel leva ao papel do usuário logado (admin → direcao).
4. **Drill-down dos KPIs novos** (§2.3 — "todo número abre a lista dos registros que o compõem"): estender `dashboard_drilldown_export.js` com os blocos `negocios_por_etapa`, `origem_ganhos`, `motivo_perda`, `negocios_parados` (mesmo padrão LGPD do T2.40 — sem e-mail/telefone).

## Fora do recorte (tasks seguintes do backlog)

- Relatórios salvos e agendados por e-mail (§2.3) — T3.19 candidata.
- Componentes arrastáveis/filtro global cruzado — avaliar após painéis por papel validados.
- V.ia (§4 — 3 estágios, decisões pendentes de fornecedor/jurídico).
- Perfis/visibilidade/backup/exportação integral (§5) — T3.20 candidata.
- Catálogo de serviços (§6 — construir na etapa 3).

## Critérios de aceite

- CA-3-077: painel de direção exibe os 10 indicadores do §2.2 (12 atuais + 6 novos = 18 KPIs nos 4 grupos), cada um com valor, variação vs. período anterior e meta quando configurada.
- CA-3-078: ciclo médio de venda = média (entrada → ganho) dos ganhos do período, provado com o caso real Felicidade (ganho 08/07/2026).
- CA-3-079: POST/PATCH /metas admin-only — operator 403; meta criada aparece no painel com progresso.
- CA-3-080: painel por papel — comercial e controladoria retornam seus KPIs próprios; admin alterna papéis na UI.
- CA-3-081: drill-down dos 4 blocos novos retorna os registros que compõem o número (sem dados pessoais).
- CA-3-082: nenhum endpoint de escrita comercial novo (guard T2.18); painéis somente leitura exceto /metas (config, admin).

## Provas

- RED: 401 sem auth em /painel/{papel} e /metas; 403 operator em POST /metas; 400 papel inválido; 400 bloco de drill-down inválido.
- GREEN: /painel/direcao com 18 KPIs e comparativo; ciclo médio calculado sobre o ganho real da Felicidade; meta criada via POST aparece em GET /metas e no painel; drill-down `origem_ganhos` retorna o negócio ganho real; painel comercial/controladoria com seus KPIs.
- Regressão: dashboard comercial, visão de coordenação, motor T3.12 e ficha intactos; export CSV do T2.40 inalterado.

## Decisões pendentes da CEO (não bloqueiam)

- Metas por indicador: os 3 seeds existentes mantidos; novas metas a critério da CEO (editável agora).
- Periodicidade/destinatários dos relatórios agendados — T3.19.
- Nome/domínio/fornecedor da V.ia — T3.21+.
