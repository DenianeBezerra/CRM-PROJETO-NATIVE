# SPEC-3-014 — T3.14 Exceções E1–E9 com conector OMIE (Leva B — gatilhos automáticos)

**Origem:** SPEC-3-012 §4 (recorte honesto: E1–E9 ficaram para quando o conector OMIE alimentasse os eventos) + decisão da CEO de 13/09 18:25 ("pode seguir com a fase 1" = opção 1 apresentada).
**Princípio inegociável (CEO, mantido):** nenhuma credencial no CRM — só identificador de cofre (regra ouro da T3.11). Nenhuma exceção é criada manualmente — gatilho é sempre automático.

## O que existe hoje (estado real inspecionado)

- Coleção `excecoes` (pbc_114055614) já tem os **10 tipos** no select: `autorizacao_pendente`, `aprovacao_bancaria_pendente`, `pagamento_nao_conciliado`, `relatorio_sem_aceite`, `nota_nao_emitida`, `nota_nao_entregue`, `recebimento_atrasado`, `documento_faltante`, `entrega_contabilidade_pendente`, `obrigacao_atrasada`. E10 já funciona (motor T3.12).
- Ficha operacional tem os campos que os gatilhos precisam: `sistema` (omie|nibo|outro), `identificacao_empresa_sistema`, `prazo_resposta_horas`, `autoriza_projecao`, `dia_emissao`, `frequencia_conciliacao`, `origem_extrato` (manual|arquivo|integracao), `documentos_exigidos`, `item_cofre_sistema`.
- `motor_rotinas.js` já tem cron 06:05 BRT + `avaliarAtrasos()` (E10) — o avaliador de E1–E9 entra no MESMO cron, sem novo agendamento.
- Conector Omie de referência (workspace, `scripts/omie_connector/`): REST JSON `https://app.omie.com.br/api/v1/{modulo}/{recurso}/`, auth `app_key`+`app_secret` no corpo, `call` no payload. Endpoints provados: `geral/contacorrente` (ListarContasCorrentes), `financas/extrato` (ListarExtrato), `financas/contacorrentelancamentos` (ListarLancCC). Para NFs: `produtos/nfconsultar` (NF-e) e `servicos/nfse` (NFS-e) — portal do desenvolvedor Omie (fonte: developer.omie.com.br/service-list).
- **Nenhuma credencial Omie existe no projeto** (secrets listados: só PB/SITE/AI/ADMIN/OPERATOR). Credenciais do conector de referência são do cliente Vanessa Tami (sensíveis, LGPD — não entram no CRM).

## Recorte

1. **Coleção `omie_integracoes`** (nova, migration 0165): 1 registro por cliente+empresa Omie.
   - `empresa` (relation, unique com app), `app_key_ref` (texto — **identificador do cofre**, NUNCA a chave), `ativo` (bool), `ultima_sincronizacao` (date), `ultimo_status` (select: ok|erro_credencial|erro_api|nao_configurado), `ultimo_erro` (texto, max 500), `config` (json: contas monitoradas, janela de consulta).
   - create/update admin-only; delete bloqueado; auditoria em toda mudança.
2. **Hook `omie_excecoes.js`** — avaliador E1–E9 no cron 06:05 (mesmo cron do motor, após `avaliarAtrasos`) + execução manual admin (`POST /backend/v1/excecoes/avaliar`):
   - **E1 `autorizacao_pendente`**: obrigação `envio_autorizacao` marcada como enviada (nova marcação `etapa_envio` na obrigação — ver item 4) + `prazo_resposta_horas` da ficha vencido → exceção para o analista; reincidente (2ª ocorrência do mesmo ciclo) → `escalada_coordenacao=true`.
   - **E2 `aprovacao_bancaria_pendente`**: obrigação `cadastro_banco` com `data_prevista` vencida e sem evidência de aprovação → exceção.
   - **E3 `pagamento_nao_conciliado`**: pagamento no Omie (movimento financeiro) sem correspondência conciliada após o prazo da obrigação `conciliacao` → exceção. Fonte: `financas/mf` (ListarMovimentos) quando integração ativa; sem integração, não avalia (fail-closed).
   - **E4 `relatorio_sem_aceite`**: obrigação `relatorio_faturamento` enviada + véspera da `dia_emissao` sem aceite → exceção.
   - **E5 `nota_nao_emitida`**: `dia_emissao` atingido + Omie mostra pendentes de emissão (NF-e/NFS-e do período) → exceção. Fonte: `produtos/nfconsultar` / `servicos/nfse`.
   - **E6 `nota_nao_entregue`**: NF emitida no Omie + obrigação `entrega_nota` vencida → exceção.
   - **E7 `recebimento_atrasado`**: título a receber vencido no Omie (`financas/cr` ListarContasReceber) sem baixa → exceção.
   - **E8 `documento_faltante`**: obrigação `fechamento` na véspera do prazo + documento de `documentos_exigidos` sem registro de recebimento → exceção (registro de recebimento = baixa da obrigação de coleta do ciclo).
   - **E9 `entrega_contabilidade_pendente`**: obrigação `entrega_contabilidade` vencida → exceção.
   - **Dedup**: cliente+tipo+referência (obrigação ou período) — rodar 2x não duplica. Resolução automática quando a condição deixa de valer (baixa da obrigação resolve E2/E4/E5/E6/E8/E9; conciliação resolve E3; baixa do título resolve E7).
3. **Marcação de etapa na obrigação** (habilita E1/E4): novo endpoint `POST /backend/v1/obrigacoes/{id}/marcar` (auth) com `etapa` permitida por tipo (ex.: `envio_autorizacao` → `enviada`; `relatorio_faturamento` → `enviada`) + campo `etapa_marcada_em` (migration 0166). Sem isso, E1/E4 nunca disparam.
4. **Sincronização Omie** (`omie_sync.js`): para integrações `ativo=true`, cron puxa movimentos/títulos/NFs do período do ciclo e grava snapshot mínimo em `omie_integracoes.config.ultima_leitura` (sem dado pessoal; só contadores e datas). Rate limit Omie respeitado (aguardar ~50s entre chamadas — lição do conector de referência). Falha de credencial/API marca `ultimo_status` e NÃO gera exceção falsa (fail-closed).
5. **UI mínima**: card "Integrações Omie" no `/operacao-dia` (admin): lista clientes com status da integração + botão "Avaliar exceções agora" (admin). Exceções E1–E9 já aparecem no bloco de atenção da T3.13 sem mudança.

## Fora do recorte

- Notificação push/WhatsApp das exceções (leva futura).
- Escrita no Omie (somente leitura — API de consulta).
- Nibo/outro sistema (só Omie nesta leva).
- Credenciais reais: a CEO cadastra cada cliente com o identificador do cofre; a injeção do segredo é feita via secrets do Skip (`OMIE_APP_KEY_{CLIENTE}`) quando a CEO autorizar cada cliente — nenhum segredo no banco.

## Critérios de aceite

- CA-3-048: E1 dispara quando `envio_autorizacao` marcada enviada + `prazo_resposta_horas` vencido; reincidente escala para coordenação.
- CA-3-049: E2/E6/E9 disparam por obrigação vencida do tipo correspondente, com dedup.
- CA-3-050: E3/E5/E7 avaliam dados do Omie SOMENTE com integração ativa; sem integração, nada dispara (fail-closed) e `ultimo_status` registra o motivo.
- CA-3-051: resolução automática fecha a exceção quando a condição deixa de valer (baixa da obrigação ou conciliação/baixa no Omie).
- CA-3-052: rodar o avaliador 2x não duplica exceção (dedup cliente+tipo+referência).
- CA-3-053: nenhuma credencial Omie é armazenada no banco — só identificador de cofre; segredo via secrets do Skip.
- CA-3-054: marcação de etapa (`/marcar`) é permitida apenas para os tipos com etapa definida e fica auditada.

## Provas

- RED: 401 sem auth em `/excecoes/avaliar` e `/marcar`; 403 operator em `/excecoes/avaliar`; 400 etapa inválida em `/marcar`; E1 não dispara sem marcação; E3/E5/E7 não disparam sem integração ativa (fail-closed).
- GREEN: fixture de ficha + obrigações → avaliador gera E1/E2/E9 com dedup; 2ª execução 0 novas; baixa da obrigação resolve a exceção; integração ativa com fixture de resposta Omie (mock via endpoint de teste admin) gera E5/E7.
- Regressão: E10 e motor T3.12 intactos; cron único 06:05 executa motor + avaliador na ordem.

## Pré-condições e dependências

- T3.12/T3.13 concluídas ✅.
- **Decisões pendentes da CEO (bloqueiam só a ativação real, não a implementação):**
  - D9: quais clientes entram primeiro na integração Omie (sugestão: Vanessa Tami — credenciais já testadas no conector de referência).
  - D10: o segredo Omie por cliente entra como secret do Skip (`OMIE_APP_KEY_{ID}` / `OMIE_APP_SECRET_{ID}`) — confirma o modelo cofre+secret?
  - D11: E7 (recebimento atrasado) vale para todos os clientes BPO ou só os com serviço de cobrança no escopo?
