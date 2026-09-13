# SPEC-3-020 — T3.20 Causas comuns C-03 + C-01 + C-04 (Direcionamento de Correções v2 — ordem 1 e 2)

**Origem:** documento da CEO "Direcionamento de Correções CRM v2" (uploads/481342f5 — cap. 3 causas comuns, cap. 9 ordem de execução) + direção da CEO 14/09 08:34 (capítulo 3 primeiro; B-19 esclarecido antes de qualquer correção cosmética).
**Princípio:** corrigir a causa, não o sintoma. Uma regra por causa; os itens derivados caem juntos.

## Investigação prévia (evidência da base real, 14/09)

- **B-19 ESCLARECIDO (sem correção de motor):** só existe 1 ficha (Felicidade, `inu2vsqgkwhkp8n`, ativa, 3 serviços). As 18 obrigações vêm TODAS dela (`ficha=inu2vsqgkwhkp8n`, `cliente=zat97l1mnjwclqi`). A AG (em implantação) tem 0 fichas e 0 obrigações. O motor **consome** a ficha (`dias_referencia`, `dia_emissao`, `periodicidade_projecao`, `prazo_entrega` são lidos no código; fechamento só é gerado se `prazo_entrega` do bloco 8 existir). Os "blocos vazios" são os campos que a UI da ficha ainda não cadastra — exatamente A-19 (listas multivaloradas) e A-20 (bloco 8), tasks próprias. **Não há duas fontes de verdade no motor.**
- **C-03 CONFIRMADO:** negócio `8tn1jwwd8xsk2u5` tem `status=em_negociacao` com `estagio=novo` (contradição real); negócio `ek8vvnaisupsnga` é `status=ganho` com `valor=0` e `data_ganho` vazio (B-14/A-14). O painel calcula receita por `status`+`data_ganho` e conversão por `permanencias`/`estagio` — duas fontes.
- **C-01 CONFIRMADO (no motor, não na API/UI):** a API `/obrigacoes?dia=` já usa `data_prevista <= dia` e a UI só mostra "Dia limpo" sem atrasos. O defeito está no **status**: obrigação vencida em 11/09 continua `prevista` (o avaliador E1 roda no cron com prazo de 48h) — toda contagem derivada de `status` fica zerada. A regra correta: **atraso é calculado por DATA (data_prevista < hoje e não concluída), não por status armazenado**.
- **C-04 CONFIRMADO em pontos:** p50=0 exibido como "0 min" (B-03); distribuições vazias como "0 itens"; datas divergentes entre telas (B-10) = timestamps UTC exibidos sem conversão para BRT (exceção aberta 12/09 16:09 UTC aparece como 12/09 numa tela e 13/09 noutra).

## Recorte desta task

1. **C-03 — etapa do funil como fonte única da verdade:**
   - Hook de consistência: `status` e `probabilidade` passam a DERIVAR da etapa (`estagio`) em toda transição — gravação de status divergente da etapa é bloqueada (model hook `onRecordValidate` em `negocios`).
   - Migração de dados: reconciliar os registros existentes (status derivado da etapa; ganho exige `valor > 0` e `data_ganho` — B-14; registro `ek8vvnaisupsnga` fica inválido até correção manual sinalizada).
   - Painel: receita nova, origem dos ganhos e conversão por etapa passam a usar a MESMA fonte (`estagio` + `data_ganho`), eliminando o cálculo duplo (A-14).
   - Probabilidade derivada da etapa, editável apenas em etapas intermediárias (B-15).
2. **C-01 — atraso é obrigação de hoje (por data, não por status):**
   - `GET /obrigacoes` passa a calcular `atrasada_efetiva = data_prevista < hoje && status não concluída/bloqueada` e retorna o campo em cada item; contagens da matriz (visão de coordenação), fila pessoal (MeuDia) e operação do dia usam esse campo.
   - Avaliador do motor: marca `atrasada` por data (sem esperar o prazo de 48h da E1 — a E1 continua como exceção, mas o status de exibição é por data).
   - "Dia limpo" só quando não há vencimento hoje E nenhum atraso efetivo (B-09/M-10); fila pessoal inclui atrasados (B-12); matriz da coordenação conta atraso efetivo (B-06).
3. **C-04 — padrão de exibição (cap. 7 do documento):**
   - Componente único `KpiValor`/helper: ausência de dado = travessão (nunca zero); sem base de comparação = omitir variação e seta; percentual exibe a base (M-03 parcial).
   - Datas: conversão única para BRT na exibição + rótulo explícito da data (B-05/B-10) — dias em aberto calculados de `aberta_em` até agora (já correto no backend; corrigir a exibição).
   - p50 = 0 (transição instantânea) exibe travessão com nota "sem intervalo mensurável" (B-03).

## Fora do recorte (tasks seguintes, ordem do cap. 9)

- C-02 (camada global de tradução de rótulos) + cap. 6 — task própria.
- Demais bloqueantes (B-02 varredura de fixtures, B-07, B-08, B-11, B-16 a B-18, B-20) — task própria.
- A-03/A-01/A-02 (metas com valor, período 90 dias, cobertura de pipeline) — task própria.
- A-19/A-20/A-21 (ficha: listas multivaloradas, bloco 8, completude/trava) — task própria.

## Critérios de aceite

- CA-3-089: nenhum registro de negócio pode ter `status` divergente da etapa (prova: tentativa de gravação divergente → 400; reconciliação dos 3 registros reais).
- CA-3-090: ganho exige valor > 0 e data_ganho (prova: transição para ganho sem valor → 400).
- CA-3-091: painel de direção calcula receita nova, origem dos ganhos e conversão por etapa da mesma fonte (prova: origem_ganhos julho = indicação R$ 8.336,11 inalterado; receita nova do ganho com valor 0 não conta como receita).
- CA-3-092: obrigação com data_prevista < hoje aparece como atraso em /obrigacoes, matriz da coordenação, operação do dia e fila pessoal, independentemente do status armazenado (prova com a obrigação real de 11/09).
- CA-3-093: "Dia limpo" só aparece sem vencimento hoje e sem atraso efetivo (prova na UI).
- CA-3-094: ausência de dado = travessão; sem base = sem seta; datas em BRT com rótulo (prova visual no painel e na coordenação).

## Provas

- RED: criar negócio com status divergente da etapa (400); ganho sem valor (400); obrigação vencida listada como prevista (falha antes da correção).
- GREEN: reconciliação dos 3 negócios reais; atraso efetivo da obrigação de 11/09 visível nas 4 telas; p50/distribuições com travessão; datas BRT consistentes entre coordenação e operação do dia.
- Regressão: motor gera 18 obrigações da ficha real inalterado; MRR 8.336,11; contratos; ficha; relatórios agendados.

## Decisões pendentes da CEO (não bloqueiam)

- D-01 (composição MRR) e D-02 (valores das metas) — cap. 8 do documento; D-02 pode ser ditado agora (6 novos negócios/mês, 1-2 diagnósticos/semana, 4h venda/semana já estão no plano do trimestre).
- Destino do registro `ek8vvnaisupsnga` (ganho sem valor): corrigir manualmente (valor/data) ou marcar perdido — decisão da CEO.
