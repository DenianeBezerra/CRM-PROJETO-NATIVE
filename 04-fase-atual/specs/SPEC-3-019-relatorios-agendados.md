# SPEC-3-019 — T3.19 Relatórios salvos e agendados por e-mail (backlog Etapa 3 — camada analítica p.2)

**Origem:** documento da CEO "Requisitos complementares da etapa 3" (§2.3 — "Relatórios salvos, organizados em pastas, com distinção entre relatórios próprios e compartilhados. Agendamento de relatório por correio eletrônico, com periodicidade configurável e destinatários definidos" + destaque: "o agendamento de relatório por correio eletrônico é o recurso de maior retorno e de menor custo desta camada") + direção da CEO 14/09 00:03 ("siga T3.19").
**Princípio:** o relatório chega sozinho — o painel deixa de depender de alguém lembrar de abrir. Nenhum dado sensível no corpo do e-mail (resumo de KPIs, sem dados pessoais de contato).

## O que existe hoje (estado real inspecionado)

- Painel de direção com 21 KPIs (T3.18) — fonte dos números do relatório.
- Export CSV do dashboard comercial (T2.40) com trilha append-only em `exportacoes`.
- SMTP: instância usa o relay compartilhado da plataforma (usesCustomSmtp=false, remetente noreply@mail.goskip.dev, Reply-To configurável). Envio custom via mail client do PocketBase no hook (`app.NewMailClient()`, referenciado no guia de e-mails do Skip) será provado no teste real; se indisponível no JSVM, o envio cai para o mecanismo alternativo provado em implementação (registra-se no changelog).
- Cron: `cronAdd` global, expressão em UTC, piso de 10 min por job. Motor T3.12 usa 06:05 UTC; avaliador T3.14 usa 09:10 UTC.
- Auditoria: select `acao` com meta_configurada (0184) — nova ação `relatorio_enviado` entra em migration.
- Última migration: 0184. Próxima: 0185.

## Recorte desta task

1. **Coleção `relatorios_agendados`** (migration 0185, append-only na prática — delete bloqueado):
   - `nome` (texto), `tipo` (select: `resumo_direcao` — único tipo no recorte), `periodicidade` (select: `semanal`|`mensal`), `dia_semana` (number 1-7, 1=segunda, usado no semanal), `hora_utc` (number 0-23), `destinatarios` (texto — e-mails separados por vírgula), `ativo` (bool), `criado_por` (relation users), `ultimo_envio_em` (date), `ultimo_status` (select: `—`|`enviado`|`falhou`).
   - Regras: list/view auth; create/update admin-only (via endpoint, não via API direta); delete null.
2. **Hook `relatorios_agendados.js`**:
   - `GET /backend/v1/relatorios` (auth) — lista.
   - `POST /backend/v1/relatorios` (admin) — cria agendamento (validação: e-mails válidos, periodicidade, dia/hora).
   - `PATCH /backend/v1/relatorios/{id}` (admin) — edita/ativa-desativa.
   - `POST /backend/v1/relatorios/{id}/enviar` (admin) — envio manual imediato (prova e reenvio).
   - `cronAdd("relatorios_agendados", "15 * * * *")` — a cada hora (min 15 past), verifica agendamentos ativos cujo horário chegou (semanal: dia_semana + hora; mensal: dia 1 + hora) e envia; idempotente por `ultimo_envio_em` (não reenvia no mesmo ciclo).
   - **Conteúdo do relatório `resumo_direcao`**: HTML com os KPIs principais do painel de direção do período (novos negócios, MRR, receita nova, propostas abertas/paradas, conversão, tarefas vencidas, negócios parados) + link do preview. Cálculo inline no hook (goja: helpers não cruzam arquivos — AP-0200), mesma fonte `negocios`/`tarefas`/`propostas`/`leads_entrada`.
   - Auditoria: acao `relatorio_enviado` (migration 0185 amplia o select) com destinatários e status.
3. **UI — página `/relatorios`** (admin-only, AdminRoute):
   - Lista dos agendamentos (nome, periodicidade, destinatários, último envio/status) + criar/editar/ativar-desativar + botão "Enviar agora".
   - Card "Relatórios agendados" na home (admin).

## Fora do recorte (tasks seguintes)

- Pastas de relatórios salvos e compartilhamento (§2.3) — avaliar após o agendado validado.
- Novos tipos de relatório (comercial, controladoria) — mesma estrutura, task seguinte.
- Exportação em documento portátil (PDF) — §2.3, task própria.
- Filtro global por período/responsável/solução nos painéis — task própria.

## Critérios de aceite

- CA-3-083: admin cria agendamento semanal com destinatários; aparece na lista com ativo=true.
- CA-3-084: envio manual gera o e-mail com os KPIs do período e registra auditoria `relatorio_enviado` + `ultimo_envio_em`/`ultimo_status`.
- CA-3-085: cron dispara no horário agendado (prova: agendamento com hora do teste + verificação de log/registro; ou execução simulada pelo endpoint de envio manual com mesmo código de geração).
- CA-3-086: operator 403 em POST/PATCH/enviar; lista acessível (200) para auth.
- CA-3-087: e-mail sem dados pessoais de contato (LGPD) — só KPIs agregados e link.
- CA-3-088: nenhum endpoint de escrita comercial novo (guard T2.18); agendamento é config.

## Provas

- RED: 401 sem auth (GET/POST/enviar); 403 operator (POST/PATCH/enviar); 400 e-mail inválido; 400 periodicidade inválida; 404 agendamento inexistente.
- GREEN: POST cria; GET lista; PATCH edita; envio manual 200 com auditoria e ultimo_envio_em preenchido; conteúdo do e-mail com KPIs reais (MRR 8.336,11 da Felicidade quando período julho).
- Regressão: painel, motor, visão de coordenação, ficha, contratos intactos; crons existentes inalterados.

## Decisões pendentes da CEO (não bloqueiam)

- D18: periodicidade padrão do primeiro agendamento (proposto: semanal, segunda 08:00 BRT = 11:00 UTC).
- D19: destinatários iniciais (proposto: deniane@vibratto.com.br).
- D20: novos tipos de relatório (comercial/controladoria) — após validação deste.
