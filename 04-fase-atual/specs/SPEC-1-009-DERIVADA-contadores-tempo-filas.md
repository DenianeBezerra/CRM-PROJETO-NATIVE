# SPEC-1-009-DERIVADA — Contadores, tempo por etapa e filas operacionais

> **Status:** SPEC DERIVADA — a SPEC-1-009 original não define os campos operacionais nem o limite de oportunidade parada.
>
> **Autorização da owner:** Deniane autorizou o prosseguimento da definição derivada em 08/09/2026.
>
> Esta micro-SPEC não substitui a SPEC original em caso de recuperação de regra conflitante.

## 1. Definição mínima aprovada

- Limite padrão de oportunidade parada: **10 dias**.
- O limite de parada deve ser configurável por administrador.
- Próxima ação terá descrição e data/hora.
- Tempo por etapa será calculado a partir de histórico de permanências.
- O contador de oportunidades ativas excluirá contatos arquivados/inativos quando aplicável e oportunidades em estado final não serão contadas como ativas.

## 2. Modelo de dados

### Histórico de permanência

Criar coleção append-only `permanencias_negocio`:

- `negocio`: relação obrigatória com `negocios`;
- `etapa`: texto obrigatório com a chave da etapa;
- `entrou_em`: data obrigatória;
- `saiu_em`: data opcional;
- `duracao_segundos`: número não negativo, preenchido ao sair;
- `criado_por`: relação opcional com `users`;
- `created`: autodate.

Regras:

- toda transição de etapa fecha a permanência aberta e cria a nova;
- no máximo uma permanência aberta por oportunidade;
- histórico não pode ser editado ou apagado diretamente;
- criação/fechamento deve ocorrer na mesma transação da mudança de estágio;
- registros de oportunidades arquivadas não entram no contador de ativas.

### Campos em `negocios`

- `proxima_acao_em`: data opcional;
- `proxima_acao_descricao`: texto opcional, máximo 500 caracteres;
- `arquivado`: bool, padrão falso.

### Configuração

Criar coleção administrativa `configuracoes_operacionais`:

- `chave`: texto único;
- `valor_numero`: número não negativo;
- `descricao`: texto;
- `updated_by`: relação com `users`;
- `updated`: autodate.

Seed obrigatório:

- `chave`: `limite_oportunidade_parada_dias`;
- `valor_numero`: `10`.

Apenas admin pode criar/alterar configuração; usuários autenticados podem consultar a configuração necessária ao cálculo.

## 3. Resultado observável

Disponibilizar na tela inicial ou em uma área operacional protegida:

- contador de oportunidades ativas;
- tempo acumulado por etapa;
- fila de próximas ações vencidas;
- fila de oportunidades paradas acima do limite configurado.

A leitura deve indicar quantidade e permitir navegar para as oportunidades correspondentes.

## 4. Regras de cálculo

- **Oportunidades ativas:** oportunidades não arquivadas e cujo estágio não seja `fechado_ganho` nem `fechado_perdido`.
- **Tempo acumulado por etapa:** soma de `duracao_segundos` das permanências encerradas; para permanência aberta, soma até o momento da consulta sem persistir mutação.
- **Próxima ação vencida:** `proxima_acao_em` anterior ao momento atual, não arquivada e sem estado final.
- **Oportunidade parada:** permanência aberta na etapa atual com duração maior que `limite_oportunidade_parada_dias`; oportunidade arquivada ou final não entra na fila.
- **Data futura:** não entra em vencidas.
- **Intervalo aberto:** é calculado até agora e não cria duplicidade.
- **Duas permanências abertas:** estado inválido; cálculo deve sinalizar erro controlado, sem somar duas vezes.

## 5. Critérios de aceite derivados

- **CA-1-12:** contador exclui arquivadas e estados finais.
- **CA-1-12A:** relógio controlado calcula permanência aberta sem duplicidade.
- **CA-1-12B:** tempo acumulado soma intervalos encerrados e o intervalo aberto até o momento da consulta.
- **CA-1-12C:** próxima ação passada entra na fila de vencidas; ação futura não entra.
- **CA-1-12D:** oportunidade parada usa o limite configurável, inicialmente 10 dias, e inclui somente a fixture exata.
- **CA-1-12E:** transição cria/fecha permanência e preserva histórico em operação atômica.
- **CA-1-12F:** admin consegue alterar o limite; operator não consegue alterar configuração.
- **CA-1-12G:** filas e contadores não expõem dados de outras entidades nem credenciais.

## 6. Fixtures mínimas

- oportunidade ativa não arquivada;
- oportunidade arquivada;
- oportunidade ganha;
- oportunidade perdida;
- permanência encerrada de duração conhecida;
- permanência aberta;
- próxima ação passada;
- próxima ação futura;
- oportunidade parada exatamente em 10 dias;
- oportunidade parada acima de 10 dias;
- registro inválido com duas permanências abertas.

## 7. Fora de escopo

- previsão de conversão;
- metas, BI ou dashboard executivo;
- múltiplos funis;
- automação de follow-up;
- alteração retroativa manual do histórico;
- integração externa.

## 8. Verificação prevista

- migration idempotente;
- hooks de transição e append-only;
- QA de regras e build;
- teste de permissões;
- teste de transição, cálculo, filas, configuração e estado inválido;
- evidência em `evidencias/spec-1-009/t9.1-green.md`.
