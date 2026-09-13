# SPEC-3-015 — T3.15 Visão de coordenação + Visão comercial (Leva C da Ficha Operacional — parte 1)

**Origem:** documento da CEO "Ficha Operacional do Cliente — Especificação Dev" (cap. 6.2, 6.3 e 8), direção da CEO de 13/09 ("siga com as tasks seguintes" após T3.14 concluída).
**Princípio:** visão de coordenação é leitura gerencial (nenhuma escrita comercial); visão comercial é somente leitura e restrita ao resumo — sem obrigações individuais, sem parâmetros operacionais, sem identificadores de cofre (cap. 6.3 e 8 do doc).

## O que existe hoje (estado real inspecionado)

- `obrigacoes` (12 tipos, 6 status, ciclo_chave, responsavel, prazo_limite) e `excecoes` (10 tipos, aberta|resolvida, destinatario_analista, aberta_em, escalada_coordenacao, reincidencia) — T3.12/T3.14.
- `fichas_operacionais` com `status_operacional` (ativo|suspenso|encerrado), `updated` (base para "desatualizada"), `volume_referencia_pagamentos`/`volume_referencia_notas`, `responsavel_principal`/`responsavel_reserva`.
- Hook `painel_papel_endpoint.js` (T3.10): papéis direcao/comercial/controladoria/administracao — KPIs COMERCIAIS, não operacionais. Não atende cap. 6.2/6.3.
- Papéis de usuário hoje: `admin` e `operator` apenas (coleção users). NÃO existem papéis "coordenacao"/"comercial".
- Motor T3.12 gera obrigações; baixa em 1 toque; E1–E10 no avaliador.
- UI: /operacao-dia (analista), /meu-dia, /painel-direcao (admin), /ficha-operacional.

## Recorte desta task

1. **Endpoint `GET /backend/v1/visao/coordenacao`** (admin-only, somente leitura):
   - **Matriz de clientes por obrigação**: para cada empresa ativa com ficha, situação do ciclo corrente (contagem por status: prevista/em_execucao/atrasada/bloqueada/concluida) + próxima obrigação vencendo.
   - **Exceções abertas por cliente e por analista**, com tempo em aberto (dias desde aberta_em) e flag de escalada.
   - **Carga por analista**: obrigações pendentes do período e nº de clientes atendidos (titular + reserva).
   - **Clientes acima do volume de referência**: obrigações concluídas no ciclo vs volume_referencia_pagamentos/notas da ficha (sinalização, não bloqueio).
   - **Fichas desatualizadas**: fichas ativas com `updated` há mais de N dias (config `visao_ficha_desatualizada_dias`, padrão 30, editável via configuracoes_operacionais).
2. **Endpoint `GET /backend/v1/visao/comercial`** (auth — qualquer usuário autenticado, somente leitura):
   - Por cliente: `operacao_em_dia` (bool — sem obrigação atrasada e sem exceção aberta), `excecoes_abertas` (SOMENTE contagem), `ultimo_fechamento` (data da última obrigação fechamento concluída).
   - NUNCA retorna: obrigações individuais, parâmetros da ficha, itens de cofre, valores de credencial.
3. **UI**:
   - Página `/visao-coordenacao` (admin-only): matriz + exceções por analista + carga + alertas de volume/ficha desatualizada. Visual harmonizado T3.09.
   - Card "Visão de coordenação" na home (visível só para admin).
   - Bloco "Situação operacional dos clientes" na home para operator (resumo comercial, fonte `/visao/comercial`).
4. **Permissões nesta task (parcial, cap. 8)**: admin = coordenação (leitura/escrita onde já existe); operator = visão comercial resumo + suas telas atuais. **Sem novos papéis nesta task** — decisão D12 pendente da CEO (criar papéis coordenacao/comercial na coleção users agora ou depois da implantação).

## Fora do recorte (próximas tasks)

- Implantação de cliente como projeto com etapas (cap. 7) — T3.16.
- Novos papéis na coleção users + RBAC completo do cap. 8 — T3.16 ou task própria (D12).
- Notificações/push das visões; exportação.

## Critérios de aceite

- CA-3-055: coordenação vê matriz clientes × obrigações do ciclo corrente com situação por status.
- CA-3-056: exceções abertas agrupadas por cliente e por analista com tempo em aberto.
- CA-3-057: carga por analista (obrigações pendentes + clientes atendidos).
- CA-3-058: cliente com volume executado acima do volume de referência é sinalizado.
- CA-3-059: ficha ativa desatualizada (updated > N dias) é sinalizada.
- CA-3-060: visão comercial retorna apenas resumo (em dia, contagem de exceções, último fechamento) — sem dados operacionais.
- CA-3-061: operator recebe 403 em /visao/coordenacao e a resposta comercial não contém parâmetros de ficha nem cofre (prova por conteúdo).

## Provas

- RED: 401 sem auth em ambos os endpoints; 403 operator em /visao/coordenacao.
- GREEN: dados reais da Felicidade Collective na matriz; exceções abertas (3 reais) com tempo em aberto; carga por analista consistente com a base; resumo comercial coerente (Felicidade com exceções abertas → operacao_em_dia=false).
- Regressão: /operacao-dia, /painel-direcao e motor intactos; nenhum endpoint de escrita novo.

## Decisões pendentes da CEO (não bloqueiam implementação)

- D12: criar papéis `coordenacao` e `comercial` na coleção users nesta fase ou após a implantação (T3.16).
- D13: N dias padrão para "ficha desatualizada" (proposto: 30).
- D14: visão comercial visível para operator hoje (proposto: sim) ou só quando existir papel comercial.
