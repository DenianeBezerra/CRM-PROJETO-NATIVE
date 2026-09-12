# SPEC-3-012 — T3.12 Motor de Rotinas + Exceções (Leva B da Ficha Operacional)

**Origem:** documento da CEO "Ficha Operacional do Cliente — Especificação Dev" (cap. 4 e 5), direção verbal de 13/09.
**Princípio inegociável (CEO):** _"o painel só entrega valor se as tarefas chegarem nele sozinhas, geradas pelo motor de rotinas a partir da ficha operacional. Se ele nascer como tela onde alguém cria tarefa manualmente, você reproduz o problema do Trello dentro do CRM."_ Ninguém cria obrigação manualmente em nenhuma hipótese.

## Recorte desta leva (B)

1. **Coleção `obrigacoes`** (append-only no ciclo; delete bloqueado):
   - tipo (12 valores do cap. 4.1: coleta_canal, lancamento, projecao, envio_autorizacao, cadastro_banco, conciliacao, relatorio_faturamento, emissao_nota, entrega_nota, validacao, fechamento, entrega_contabilidade)
   - cliente (relação empresas), ficha (relação fichas_operacionais)
   - responsavel (titular; reserva quando titular ausente — campo substituicao_aplicada)
   - data_prevista, prazo_limite
   - status: prevista | em_execucao | concluida | atrasada | bloqueada | nao_aplicavel
   - motivo_bloqueio (obrigatório quando bloqueada), evidencia (texto/ref), data_conclusao, concluida_por
   - gerada_em, ciclo_chave (dedup: cliente+tipo+data_prevista)
2. **Motor de geração** (`motor_rotinas.js`):
   - Cron diário 06:05 BRT + execução manual admin.
   - Lê fichas ativas; para cada serviço contratado, gera obrigações de **um ciclo completo à frente** (mín. próxima ocorrência + seguinte).
   - Calendário de dias úteis (feriados nacionais fixos 2026; municipais ficam como decisão pendente — campo `feriados_municipais` na ficha quando a CEO levantar).
   - Antecipação automática quando a data cai em não útil.
   - Alteração de parâmetro afeta só obrigações futuras (nunca regera o passado).
   - Suspensão do cliente interrompe geração sem apagar histórico.
   - Dedup por ciclo_chave — rodar 2x não duplica.
   - Substituição titular→reserva: se titular inativo no momento da geração, obrigações nascem para o reserva com flag.
3. **Baixa em um toque** (`POST /backend/v1/obrigacoes/{id}/baixa` e `/baixa-lote`):
   - Um clique conclui; resultado opcional (diferente de tarefas comerciais — requisito de adoção do cap. 4.2).
   - Baixa em lote por tipo+cliente na mesma sessão.
   - Bloqueada exige motivo_bloqueio (endpoint próprio `POST /{id}/bloquear`).
4. **As 10 exceções do cap. 5** — avaliadas no mesmo cron, criadas como registro em `excecoes` (cliente, tipo, gatilho, aberta_em, prazo_alerta, destinatarios, status aberta|resolvida, resolvida_em):
   - E1 autorização de projeção pendente (projeção enviada + prazo_resposta_horas da ficha vencido) → analista; reincidente → coordenação
   - E2 aprovação bancária pendente (cadastro no banco + data prevista vencida)
   - E3 pagamento não conciliado (pagamento executado sem correspondência no prazo)
   - E4 relatório de faturamento sem aceite (enviado + véspera da emissão)
   - E5 nota não emitida (data de emissão atingida com pendentes)
   - E6 nota emitida e não entregue
   - E7 recebimento em atraso
   - E8 documento faltante no fechamento
   - E9 entrega à contabilidade pendente
   - E10 obrigação atrasada (prazo_limite ultrapassado)
   - **Recorte honesto:** E1–E9 dependem de eventos que hoje não têm registro estruturado no CRM (envio da projeção, cadastro no banco, emissão da nota). Nesta leva, implemento **E10 completa** (derivada das próprias obrigações — dado 100% interno) + **estrutura de exceções** com os 10 tipos cadastrados e gatilho acionável por marcação de etapa na obrigação (ex.: "enviada para autorização" em E1). As exceções que exigirem integração com Omie/banco ficam para a leva seguinte, quando o conector OMIE alimentar os eventos.
5. **Visão do analista (cap. 6.1)** — página `/operacao-dia`:
   - Obrigações do dia agrupadas por cliente, ordenadas por prazo.
   - Bloco destacado de atrasos + exceções abertas ACIMA das obrigações do dia.
   - Procedimento vigente do cliente acessível dentro da obrigação (link para a ficha).
   - Baixa em 1 toque na lista.
6. **Integração com Meu dia (T3.08):** seção "Obrigações operacionais" no /meu-dia (mesma fonte), sem duplicar tela.

## Fora do recorte (levas seguintes)

- E1–E9 com gatilhos automáticos reais (dependem de conector OMIE/banco ou registro de eventos)
- Visão de coordenação (cap. 6.2) e visão comercial (cap. 6.3)
- Implantação de cliente como projeto (cap. 7)
- Exportação do procedimento em documento portátil
- Calendário municipal por cliente (decisão pendente da CEO)

## Critérios de aceite (cap. 10 aplicado a esta leva)

- CA-3-036: motor gera obrigações de um ciclo completo para ficha semanal, quinzenal e decendial, respeitando dias úteis (antecipação em não útil).
- CA-3-037: obrigação vencida sem baixa vira atrasada e gera exceção E10 com alerta.
- CA-3-038: baixa em um toque na lista (+ lote).
- CA-3-039: ausência do titular transfere para o reserva na geração.
- CA-3-040: rodar o motor 2x não duplica obrigação (dedup ciclo_chave).
- CA-3-041: suspensão do cliente interrompe geração sem apagar histórico.
- CA-3-042: nenhuma obrigação é criável manualmente (sem rota de create aberta).

## Decisões pendentes da CEO (do cap. 11 do doc)

- Feriados municipais por cliente (uso feriados nacionais 2026 até lá)
- Prazos de resposta por cliente (uso prazo_resposta_horas da ficha; default 24h)
- Volumes de referência nos contratos (campo já existe na ficha)
