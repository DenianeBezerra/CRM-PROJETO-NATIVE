# SPEC-3-020 — T3.20 Causas comuns C-03 + C-01 + C-04 (Direcionamento de Correções v2 — ordem 1 e 2)

**Origem:** documento da CEO "Direcionamento de Correções CRM v2" (uploads/481342f5 — cap. 3 causas comuns, cap. 9 ordem de execução) + direção da CEO 14/09 08:34 (capítulo 3 primeiro; B-19 esclarecido antes de qualquer correção cosmética).
**Princípio:** corrigir a causa, não o sintoma. Uma regra por causa; os itens derivados caem juntos.

## Investigação prévia (evidência da base real, 14/09)

- **B-19 ESCLARECIDO (sem correção de motor):** só existe 1 ficha (Felicidade, inu2vsqgkwhkp8n, ativa, 3 serviços). As 18 obrigações vêm TODAS dela. A AG (em implantação) tem 0 fichas e 0 obrigações. O motor CONSUME a ficha (dias_referencia, dia_emissao, periodicidade_projecao, prazo_entrega); fechamento só é gerado se o bloco 8 existir. Os "blocos vazios" são os campos que a UI da ficha ainda não cadastra — A-19/A-20, tasks próprias.
- **C-03 CONFIRMADO:** negócio 8tn1jwwd8xsk2u5 tem status=em_negociacao com estagio=novo; ek8vvnaisupsnga é ganho com valor 0 e data_ganho vazio (B-14/A-14). O painel calcula receita por status+data_ganho e conversão por permanencias/estagio — duas fontes.
- **C-01 CONFIRMADO (no motor):** obrigação vencida em 11/09 continua 'prevista' (avaliador E1 roda no cron com prazo 48h) — a regra correta: atraso é calculado por DATA, não por status armazenado.
- **C-04 CONFIRMADO:** p50=0 exibido como "0 min" (B-03); datas divergentes (B-10) = timestamps UTC exibidos sem conversão para BRT.

## Recorte desta task

1. **C-03 — etapa do funil como fonte única da verdade:** status e probabilidade DERIVAM da etapa em toda gravação (a etapa vence — status divergente é sobrescrito); reconciliação dos registros existentes (0187); ganho exige valor > 0 e data_ganho (B-14); painel usa a mesma fonte para receita/origem/conversão (A-14).
2. **C-01 — atraso é obrigação de hoje (por data):** atrasada_efetiva = data_prevista < hoje && não concluída em GET /obrigacoes; matriz da coordenação (B-06), fila pessoal (B-12), operação do dia (B-09) e visão comercial usam o campo.
3. **C-04 — padrão de exibição (cap. 7):** ausência de dado = travessão (nunca zero); sem base = sem seta; p50=0 → travessão (B-03); datas em BRT com rótulo (B-05/B-10).

## Fora do recorte (tasks seguintes, ordem do cap. 9)

C-02 (tradução de rótulos) + cap. 6; demais bloqueantes (B-02, B-07, B-08, B-11, B-16 a B-18, B-20); A-03/A-01/A-02; A-19/A-20/A-21.

## Critérios de aceite

- CA-3-089: nenhum registro de negócio pode ter status divergente da etapa (prova: gravação divergente é sobrescrita; reconciliação dos 3 registros reais).
- CA-3-090: ganho exige valor > 0 e data_ganho (prova: transição para ganho sem valor → 400).
- CA-3-091: painel calcula receita nova, origem dos ganhos e conversão por etapa da mesma fonte.
- CA-3-092: obrigação com data_prevista < hoje aparece como atraso em /obrigacoes, matriz, operação do dia e fila pessoal, independentemente do status armazenado.
- CA-3-093: "Dia limpo" só aparece sem vencimento hoje e sem atraso efetivo.
- CA-3-094: ausência de dado = travessão; sem base = sem seta; datas em BRT com rótulo.

## Provas

- RED: PATCH com status divergente (sobrescrito, não 400 — a etapa vence); ganho sem valor → 400; obrigação vencida listada como prevista antes da correção.
- GREEN: reconciliação dos 3 negócios reais; atraso efetivo visível nas 4 telas; p50/distribuições com travessão; datas BRT consistentes.
- Regressão: motor gera 18 obrigações da ficha real inalterado; MRR 8.336,11; contratos; ficha; relatórios agendados.

## Decisões pendentes da CEO (não bloqueiam)

- D-01 (composição MRR) e D-02 (valores das metas) — cap. 8 do documento.
- Destino do registro ek8vvnaisupsnga (ganho sem valor): corrigir manualmente ou marcar perdido — decisão da CEO.
