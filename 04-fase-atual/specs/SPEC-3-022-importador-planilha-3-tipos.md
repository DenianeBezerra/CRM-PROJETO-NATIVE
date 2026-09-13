# SPEC-3-022 — Importador por planilha (3 tipos)

**Task:** T3.22 · **Origem:** pedido da CEO (13/09, reafirmado no retorno de 13/09 ~12:00) · **Status:** SPEC publicada — aguardando autorização de implementação
**Prioridade:** acima da Visão 3 e do quadro anual (decisão da CEO) — destrava a carga da carteira, hoje bloqueada.

## Objetivo

Importar bases externas via planilha (CSV/XLSX) para o CRM. Este documento CONSOLIDA o que já foi definido pela CEO nas mensagens anteriores; nenhuma decisão é reaberta.

## Tipos e destinos

| Tipo                             | Conteúdo                     | Destino no CRM                                                        |
| -------------------------------- | ---------------------------- | --------------------------------------------------------------------- |
| 1 — Clientes ativos              | empresa + contato + contrato | entra como cliente ativo, SEM passar pelo funil                       |
| 2 — Listas de prospecção         | contato                      | estágio de prospecção, sem oportunidade                               |
| 3 — Base LinkedIn (8k+ contatos) | contato                      | estágio próprio (rede LinkedIn), FORA das telas de cliente por padrão |

## Tipo 1 — marcação de migração (regra da CEO)

- Todo negócio criado pelo tipo 1 entra marcado como **MIGRAÇÃO** (flag própria na origem do registro).
- Permanece **FORA** dos indicadores de conversão, ciclo de venda e origem de ganhos (não polui as métricas do funil com clientes que já eram da carteira).
- Entra **APENAS na receita recorrente (MRR)**, a partir da **data de início da operação** informada na planilha.

## Campos obrigatórios por tipo

- **Tipo 1**: nome/razão social da empresa, CNPJ, contato (nome + e-mail), valor do contrato (mensalidade), data de início. Opcionais: telefone, setor, observações.
- **Tipo 2**: nome + pelo menos um contato (e-mail ou telefone), origem da lista. Opcionais: empresa, observações.
- **Tipo 3**: nome, e-mail, URL do perfil LinkedIn, cargo/empresa. Opcionais: telefone.

## Regras transversais

1. **Validação de CNPJ** com enriquecimento automático (mesma base informativa da Porta 1 — BrasilAPI).
2. **Pré-visualização é BLOQUEIO OBRIGATÓRIO** (não etapa recomendada): contagem de linhas válidas / inválidas / duplicadas + amostra; o endpoint de gravação só executa após a pré-visualização confirmada do mesmo lote — nada grava sem confirmação explícita.
3. **Deduplicação** por CNPJ (empresas) e por e-mail (contatos): para cada duplicata, escolha ATUALIZAR ou IGNORAR, decidida na pré-visualização (por lote, não linha a linha).
4. **Identificação por lote**: toda importação cria registro de lote (data, tipo, arquivo, contagens, responsável); o lote pode ser DESFEITO integralmente (remove o que criou; restaura valores anteriores dos registros que atualizou).
5. **Exportação no mesmo formato**: template de download por tipo (mesmas colunas da importação) + exportação da base atual no mesmo formato.
6. **RBAC**: disponível apenas aos perfis de direção (admin) e coordenação; operator e social_media recebem 403.
7. **LGPD (tipos 2 e 3)**: origem da base registrada no lote; retenção conforme D5 (24 meses da coleta ou do último contato, o que for mais recente); sem dados sensíveis; tipo 3 excluído dos contadores e painéis por padrão.

## Cadências (pertencem ao CONTATO, não à oportunidade)

- **Contato novo (tipo 2): cadência de 7 passos.**
- **Base própria de rede (tipo 3): cadência de 5 passos.**
- A cadência pertence ao contato. **Oportunidade só nasce no convite aceito ou no agendamento da reunião** — nunca na importação.
- A sequência exata dos passos é a definição da CEO (mensagem de 13/09); será registrada como configuração (não hardcoded) na implementação — se houver divergência entre este documento e a mensagem original, prevalece a mensagem.

## Ordem de entrega (decisão da CEO)

1. **Tipo 1 isolado** → parada para validação da CEO antes de iniciar os tipos 2 e 3.
2. Motivo: o tipo 1 destrava a carga dos 18 clientes ativos (o sistema passa a refletir o negócio real); os tipos 2 e 3 dependem de filtragem da base de contatos pela CEO, ainda não concluída — a carga da carteira ocorre em paralelo à construção dos demais.

## Critérios de aceite

- **CA-3-105**: tipo 1 cria empresa + contato + contrato como cliente ativo, sem passar pelo funil.
- **CA-3-106**: tipo 2 cria contato em estágio de prospecção, sem oportunidade.
- **CA-3-107**: tipo 3 cria contatos em estágio próprio, invisíveis nas telas de cliente por padrão.
- **CA-3-108**: CNPJ inválido é rejeitado; enriquecimento exibido na pré-visualização.
- **CA-3-109**: pré-visualização obrigatória; nada grava sem confirmação.
- **CA-3-110**: dedup por CNPJ/e-mail com escolha atualizar/ignorar.
- **CA-3-111**: lote identificado e desfazível integralmente.
- **CA-3-112**: template e exportação no mesmo formato.
- **CA-3-113**: operator e social_media 403 em todas as rotas do importador.
- **CA-3-114**: cadências 7/5 passos vinculadas ao contato; oportunidade só no convite/agendamento.
- **CA-3-115**: negócio do tipo 1 marcado como migração — ausente dos indicadores de conversão/ciclo/origem; presente apenas no MRR a partir da data de início da operação.
- **CA-3-116**: gravação sem pré-visualização confirmada do lote é bloqueada (não é recomendada — é impedida).

## Fora do escopo

Enriquecimento além do CNPJ (serviços pagos de terceiros); importação de oportunidades existentes; automação de envio das etapas da cadência (fase seguinte).
