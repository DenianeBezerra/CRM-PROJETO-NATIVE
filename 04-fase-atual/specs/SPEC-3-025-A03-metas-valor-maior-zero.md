# SPEC-3-025 — A-03: bloquear meta ativa sem valor válido

**Task:** T3.25 — Direcionamento de Correções CRM v2, A-03 (ordem 4: junto de A-01/A-02, iniciada por A-03 após decisão expressa da CEO).
**Decisão da CEO (2026-10-22):** meta ativa precisa ter valor numérico estritamente maior que zero. Zero não é meta válida. Campo vazio nunca deve ser convertido em zero.
**Fontes:** `uploads/481342f5-Direcionamento_Correcoes_CRM_Vibratto_v2.docx` §5 A-03 e §9; `SPEC-3-018-painel-papel-metas.md`; decisão expressa da CEO.
**Status:** especificada; aguardando autorização de implementação. Nenhuma alteração de código/dados incluída nesta task de formalização.

## Objetivo e resultado observável

Impedir que uma meta marcada como ativa seja criada ou atualizada com valor ausente, vazio, inválido, zero ou negativo; exibir feedback claro sem apagar o valor anterior; indicar e tratar registros legados inválidos sem apresentá-los como metas válidas. A validação deve ocorrer no servidor (fonte de verdade) e no formulário (feedback precoce). Nenhum valor é corrigido automaticamente ou inventado.

## Escopo mínimo

1. **API `POST /backend/v1/metas`:** exigir `valor_meta` enviado como número finito e `> 0` quando `ativo=true` (inclusive ausência, `null`, string vazia, texto, `0`, negativo, NaN/Infinity representados como valores inválidos); responder 400 com erro nomeado em português. Preservar RBAC admin-only, deduplicação, auditoria, papel e periodicidade.
2. **API `PATCH /backend/v1/metas/{id}`:** validar o estado final, não apenas o campo isolado. Se a meta estiver ativa após a operação, o valor persistido deve ser número finito `> 0`. Rejeitar ativação de legado sem valor válido; permitir desativar meta inválida sem exigir valor, para que possa ser corrigida/inativada. Não persistir parcialmente em uma requisição inválida.
3. **Frontend `PainelDirecao.tsx`:** entradas de meta controladas ou validadas sem `Number("")`/conversão implícita do vazio em zero; `min=0.01` (step compatível com uso decimal), validar no submit e mostrar mensagem acessível associada ao campo; não enviar requisição quando vazio/zero/inválido; preservar edição anterior em falha. Permitir valor explícito apenas se maior que zero.
4. **Legados:** não alterar/seedar números em migrations nesta task. Ao carregar metas, identificar as ativas com valor ausente/inválido/≤0; mostrar estado “meta incompleta”/“valor inválido”, sem barra ou progresso calculado sobre zero. Dar ação segura de corrigir com valor >0 ou desativar. Auditoria deve registrar a correção/inativação conforme o padrão existente. Sem dizer que “não existe meta” quando existe registro inválido.
5. **Não escopo:** A-01 (período padrão/comparativo), A-02 (cobertura do pipeline), metas novas/valores recomendados, mudar periodicidade ou dicionário de indicadores, limpeza de fixture `t318_meta_prova`, migração ou ajuste automático de dados, publicar produção.

## Critérios de aceite (binários)

- **CA-3-146 — POST vazio:** sem `valor_meta`, `null`, `""` ou string não numérica → 400; nenhum registro criado; erro em português.
- **CA-3-147 — POST faixa:** `0` ou número negativo em meta ativa → 400; valor positivo finito decimal (ex. 0,5) → 200; trilha de auditoria presente e RBAC admin-only inalterado.
- **CA-3-148 — PATCH estado final:** atualizar ativa para vazio/0/negativo/inválido → 400 e valor anterior preservado; ativar meta legada inválida sem enviar valor → 400; desativar meta inválida → permitido; corrigir para valor positivo → permitido.
- **CA-3-149 — UI:** formulário de meta nova e edição bloqueiam vazio/0/negativo e informam o motivo antes do envio; mensagem acessível; erro de API preserva o input; sucesso atualiza o painel.
- **CA-3-150 — legado:** meta ativa com valor inválido aparece identificada como incompleta; não exibe barra de progresso enganosa; admin consegue corrigir ou desativar sem alterar outras metas.
- **CA-3-151 — regressão:** metas existentes válidas (incluindo decimais, como 1,5) permanecem editáveis; painel por papel, metas, auditoria, RBAC, receita e indicadores sem regressão; nenhuma mutation em `negocios`.

## Provas TDD

1. RED por API admin: POST sem campo, `null`, `""`, string inválida, 0 e negativo; verificar 400 e coleção inalterada. Operador sem permissão: 403.
2. GREEN: POST valor positivo (inclui decimal), registro e auditoria; PATCH para valor positivo; PATCH inválido preserva snapshot anterior; desativação de inválida; bloqueio de reativação inválida.
3. Fixture legada isolada, marcada `[PROVA T3.25]`, criada e removida em fluxo seguro e idempotente; comprovar UI incompleta sem editar outros registros.
4. Testes frontend/unitários (ou script de teste disponível): vazio não vira 0; validação para 0 e para positivo; submit não dispara em inválidos; mensagem; erro preserva entrada.
5. Regressão API/UI: metas seed e papel; painel Direção; `GET /backend/v1/metas`; auditoria `meta_configurada`; `/painel-direcao` e papéis. Limpar fixtures; não tocar `t318_meta_prova` existente nem metas reais.

## Arquivos/componentes prováveis

- `pocketbase/hooks/painel_papel_endpoint.js` (validação POST/PATCH e leitura de legado, caso necessário).
- `src/pages/PainelDirecao.tsx` (estado, validação e UI acessível para criar/editar/inativar).
- Testes automatizáveis no padrão já adotado; migrations somente se a análise de implementação provar necessidade — preferir validação no hook sem alterar schema.

## Riscos e guardrails

- **Dados financeiros/metas:** nunca inferir nem substituir metas existentes. Preservar estado em falha; somente alterar dados de teste próprios, com limpeza comprovada.
- **Compatibilidade:** valores fracionários são usados (1,5 diagnóstico/semana); não impor somente inteiro nem step incompatível.
- **API:** prevenir bypass de frontend. Validar tipos e presença explicitamente antes de conversões numéricas; PATCH avalia o estado final; toda gravação continua auditada.
- **Acessibilidade:** erro ligado ao input via `aria-describedby`, `aria-invalid`; não depender só de cor.
- **Privacidade:** não exibir detalhes de outros registros no alerta; sem PII nas provas/evidência.
- **Deploy:** só preview; nenhum publish de produção nesta task.

## Roteiro de teste humano (após implementação, separado do gate de autorização)

1. Abrir `/painel-direcao`; confirmar metas válidas atuais e a fixture legada isolada em estado explícito.
2. Tentar deixar valor vazio e salvar; confirmar aviso, sem salvamento.
3. Tentar inserir 0; confirmar aviso, sem salvamento.
4. Salvar valor positivo decimal em fixture isolada e validar atualização; simular valor positivo alterado para inválido, confirmar erro sem perda do que estava digitado.
5. Corrigir ou inativar somente a fixture inválida; confirmar estado final e ausência de barra enganosa.
6. Confirmar regressão visual das metas existentes e que nenhum dado real foi alterado. Cancelar sem salvar qualquer meta de negócio.
