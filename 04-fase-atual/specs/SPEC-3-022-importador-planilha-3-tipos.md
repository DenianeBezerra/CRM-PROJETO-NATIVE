# SPEC-3-022 — Importador por planilha (3 tipos)

**Task:** T3.22 · **Origem:** pedido da CEO (13/09, reafirmado no retorno de 13/09 ~12:00) · **Status:** SPEC v4 — complemento de contatos múltiplos consolidado (retorno da CEO 13/09 ~13:00) — ENVIADA PARA LEITURA antes da implementação
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

- **Tipo 1 — planilha A (empresas)**: nome/razão social da empresa, CNPJ, contato principal (nome + e-mail), **natureza_registro** (cliente | empresa do grupo | projeto — OBRIGATÓRIA), **cargo_contato** (OBRIGATÓRIA), **analista_titular** (OBRIGATÓRIA — usuário do CRM; distribui a carteira na importação), **sistema de gestão utilizado** (lista: Omie, Nibo, Olist, Profilm, Controle + opção livre com nome obrigatório), **serviços contratados** (um ou mais; ver regra de múltiplos serviços), valor da mensalidade POR serviço, data de início da operação. Opcionais: telefone, setor, observações, vigência do contrato.
- **Tipo 1 — planilha B (contatos adicionais)**: opcional, uma linha por pessoa. Colunas: cnpj (chave de vínculo), nome, e-mail, telefone, cargo, papel_operacional. Ver seção "Contatos múltiplos no tipo 1".
- **Tipo 2**: nome + pelo menos um contato (e-mail ou telefone), origem da lista. Opcionais: empresa, observações.
- **Tipo 3**: nome, URL do perfil LinkedIn (OBRIGATÓRIOS — a exportação de conexões nem sempre traz e-mail e a cadência de 5 passos ocorre dentro da própria plataforma). Opcionais: e-mail, cargo, empresa, telefone.

## Múltiplos serviços por cliente (tipo 1)

- A planilha comporta MAIS DE UM serviço por cliente (ex.: BPO + CFO as a Service), com valor individual por serviço.
- Cada serviço gera um negócio/contrato PRÓPRIO com o seu valor — a participação de cada linha de solução na receita fica mensurável (indicador da meta em curso). Valor único por cliente é proibido.

## Contatos múltiplos no tipo 1 (complemento consolidado — retorno da CEO 13/09 ~13:00)

É comum, na carteira, a empresa possuir mais de um sócio ou responsável que interage com a operação. A estrutura de UM contato por empresa não comporta isso. A solução NÃO usa colunas numeradas (contato 2, contato 3): teto fixo exclui empresas com mais responsáveis, gera colunas vazias e trata contato como atributo da empresa, quando ele é registro próprio.

**Estrutura — duas planilhas no tipo 1, importadas na mesma operação e no mesmo lote:**

- **Planilha A (empresas)**: uma linha por empresa, com as colunas atuais + as três novas (natureza_registro, cargo_contato, analista_titular), incluindo o contato principal (obrigatório, referência comercial).
- **Planilha B (contatos adicionais)**: uma linha por pessoa, OPCIONAL. Colunas: cnpj, nome, e-mail, telefone, cargo, papel_operacional. O CNPJ é a chave de vínculo com a empresa da planilha A. Empresa com um único responsável não aparece na B; empresa com cinco aparece cinco vezes.

**Regras:**

1. O contato principal da planilha A é obrigatório e continua sendo o contato de referência comercial.
2. A planilha B é opcional.
3. **Papel operacional** usa os mesmos valores do bloco 9 da ficha operacional: autoriza_projecao (autoriza a projeção), aprova_banco (aprova no banco), aprova_faturamento (aprova o faturamento), envia_informacao (envia informação), apenas_informado (apenas informado). Um contato pode acumular mais de um papel. A coluna aceita código OU texto em linguagem humana, com múltiplos papéis separados por `|` (mesma convenção da coluna de serviços).
4. Contato da planilha B cujo CNPJ não conste da planilha A nem da base é REJEITADO na pré-visualização, com indicação da linha.
5. A pré-visualização exibe as DUAS planilhas em conjunto, com contagem de empresas e de contatos por empresa, antes da confirmação.
6. Desfazer o lote remove empresas e contatos criados nas DUAS planilhas.
7. **Mesmo e-mail do contato principal na mesma empresa (planilha B)**: tratar como a MESMA pessoa — somar os papéis ao registro existente no bloco 9, sem criar duplicata (decisão da CEO).
8. **Contato B já existente na base vinculado a OUTRA empresa**: a pré-visualização exibe o NOME da outra empresa à qual a pessoa está vinculada (não apenas sinaliza a ocorrência) — informação necessária para decidir entre atualizar e ignorar (decisão da CEO).
9. **Pessoa que atua legitimamente em mais de uma empresa** (comum em grupos societários): o sistema deve permitir vínculo do mesmo contato com mais de uma empresa. LIMITAÇÃO CONHECIDA: o modelo atual tem `clientes.empresa` como relação única (1 contato → 1 empresa). Enquanto não houver tabela de vínculo N:N, a pré-visualização trata o caso como DECISÃO MANUAL (sinaliza e exige escolha explícita), sem duplicar nem substituir silenciosamente.

**Efeito na ficha operacional (decisões da CEO sobre a criação automática):**

- A importação CRIA a ficha operacional de cada empresa importada, com status **em_implantacao** (implantação em andamento — NUNCA ativa).
- A importação preenche APENAS o **bloco 9 (pessoas)** da ficha, com os papéis operacionais da planilha B (e do contato principal). Os demais blocos (identificação/responsabilidade, sistema, canais, contas bancárias, contas a pagar, faturamento, conciliação, fechamento) NASCEM VAZIOS e precisam ser preenchidos individualmente.
- A **trava de completude permanece valendo integralmente**: ficha incompleta NÃO ativa cliente e NÃO gera obrigações no motor de rotinas.
- O **indicador de completude reflete a realidade**: fichas nascidas da importação aparecem como incompletas (só o bloco 9 preenchido) — a direção não pode ler "18 fichas prontas" quando são 18 fichas com um bloco só.
- Registro explícito: **a importação NÃO conclui a ficha operacional** — ela apenas cria o registro e adianta o bloco de pessoas.
- **natureza_registro**: registros marcados como "empresa do grupo" ou "projeto" NÃO entram na contagem de carteira, no MRR nem nos indicadores de clientes ativos. Duas empresas a serem carregadas pertencem ao próprio grupo.
- **cargo_contato**: campo NOVO no cadastro de contatos (texto livre) — migration simples.
- **analista_titular**: a carteira nasce distribuída entre os responsáveis, sem reatribuição manual posterior (validar que o nome informado corresponde a um usuário ativo do CRM; inválido = linha rejeitada na pré-visualização).

## Regras transversais

1. **Validação de CNPJ** com enriquecimento automático (mesma base informativa da Porta 1 — BrasilAPI).
2. **Pré-visualização é BLOQUEIO OBRIGATÓRIO** (não etapa recomendada): contagem de linhas válidas / inválidas / duplicadas + amostra; o endpoint de gravação só executa após a pré-visualização confirmada do mesmo lote — nada grava sem confirmação explícita.
3. **Deduplicação** por CNPJ (empresas) e por e-mail (contatos): para cada duplicata, escolha ATUALIZAR ou IGNORAR, decidida na pré-visualização (por lote, não linha a linha).
4. **Identificação por lote**: toda importação cria registro de lote (data, tipo, arquivo, contagens, responsável); o lote pode ser DESFEITO integralmente (remove o que criou; restaura valores anteriores dos registros que atualizou).
5. **Exportação no mesmo formato**: template de download por tipo (mesmas colunas da importação) + exportação da base atual no mesmo formato.
6. **RBAC**: disponível apenas aos perfis de direção (admin) e coordenação; operator e social_media recebem 403.
7. **LGPD (tipos 2 e 3)**: origem da base registrada no lote; **prazo de retenção PENDENTE de decisão da CEO, com avaliação jurídica** (a D5 do formulário de entrada NÃO define este prazo). Padrão provisório SUGERIDO até definição: 24 meses da coleta ou do último contato, o que for mais recente — valor de sugestão, não de decisão. Sem dados sensíveis; tipo 3 excluído dos contadores e painéis por padrão.

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
- **CA-3-117**: tipo 1 aceita múltiplos serviços por cliente — um negócio por serviço, com valor próprio; participação por linha mensurável no painel.
- **CA-3-118**: tipo 1 exige sistema de gestão (lista fechada + opção livre com nome) e serviços contratados; tipo 3 exige nome + URL do perfil, com e-mail opcional.
- **CA-3-119**: tipo 1 comporta DUAS planilhas (A empresas / B contatos adicionais) importadas na mesma operação e no mesmo lote; planilha B é opcional, uma linha por pessoa, com CNPJ como chave de vínculo.
- **CA-3-120**: planilha A exige natureza_registro (cliente/empresa do grupo/projeto), cargo_contato e analista_titular; registros "empresa do grupo" e "projeto" ficam FORA da contagem de carteira, do MRR e dos indicadores de clientes ativos.
- **CA-3-121**: papel operacional da planilha B usa os valores do bloco 9 da ficha operacional, aceita código ou texto em linguagem humana, com múltiplos papéis separados por `|`.
- **CA-3-122**: contato da planilha B com CNPJ ausente da planilha A e da base é rejeitado na pré-visualização, com indicação da linha.
- **CA-3-123**: pré-visualização exibe as duas planilhas em conjunto, com contagem de empresas e de contatos por empresa.
- **CA-3-124**: desfazer o lote remove empresas e contatos criados nas duas planilhas.
- **CA-3-125**: contato B com o mesmo e-mail do contato principal da mesma empresa é tratado como a mesma pessoa — papéis somados ao registro existente no bloco 9, sem duplicata.
- **CA-3-126**: contato B já existente vinculado a OUTRA empresa tem o nome dessa empresa exibido na pré-visualização.
- **CA-3-127**: pessoa que atua em mais de uma empresa é tratada como decisão manual na pré-visualização (limitação conhecida: relação única contato→empresa no modelo atual).
- **CA-3-128**: a importação cria a ficha operacional de cada empresa importada com status em_implantacao e preenche APENAS o bloco 9; os demais blocos nascem vazios e o indicador de completude reflete isso.
- **CA-3-129**: a trava de completude permanece integral — ficha incompleta não ativa cliente e não gera obrigações no motor de rotinas; a importação NÃO conclui a ficha operacional.
- **CA-3-130**: cargo do contato é campo novo de texto livre no cadastro de contatos; analista_titular é validado contra usuários ativos do CRM (inválido = linha rejeitada na pré-visualização).

## Fora do escopo

Enriquecimento além do CNPJ (serviços pagos de terceiros); importação de oportunidades existentes; automação de envio das etapas da cadência (fase seguinte).
