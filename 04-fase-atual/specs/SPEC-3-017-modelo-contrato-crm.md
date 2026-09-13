# SPEC-3-017 — T3.17 Modelo de contrato no CRM (geração na etapa preparacao_contrato)

**Origem:** CEO 13/09 23:08 — "o nosso envio de contrato segue via ClickSign para a assinatura, o CRM deve integrar também ao app de contratos?" + insumo real: contrato da Felicidade Collective (uploads/89255f6f, 9 cláusulas). A T3.17 é o passo ANTERIOR à integração ClickSign: o CRM precisa primeiro GERAR o contrato preenchido a partir do negócio ganho.

**Princípio:** o contrato nasce dos dados que o CRM já tem (negócio ganho, empresa, cliente, ficha) — nenhuma variável é inventada. O que o CRM não tem (representantes, sede completa) é preenchido pela CEO na hora da geração e fica registrado na versão. Nenhuma credencial em nenhuma tabela (regra ouro T3.11).

## O que existe hoje (estado real inspecionado)

- Etapa `preparacao_contrato` já existe no pipeline (ordem 45, sistema=true, ativa — migration 0172).
- `negocios` ganho real disponível: Felicidade Collective (4warv94hav36065) — valor 8336.11, servico bpo_financeiro, recorrencia mensal, data_ganho 08/07/2026.
- `empresas`: campos nome, cnpj, setor, status, observacoes — SEM razão social completa, sede, representantes.
- `clientes`: nome, email, telefone, empresa, cidade.
- Padrão de geração de texto já provado: e-mail de boas-vindas (GET /implantacoes/{id}/email-boas-vindas — corpo gerado + botão Copiar texto na UI, auditoria email_boas_vindas_gerado).
- Padrão de versionamento já provado: fichas_proposta (versao incremental por PATCH) e diagnosticos.
- `handoffs` já têm checklist com item "Contrato assinado e arquivado" — o contrato gerado alimenta esse ciclo.
- Última migration: 0179. Próxima: 0180.

## Recorte desta task

1. **Migration 0180**:
   - Nova coleção `contratos` (append-only no ciclo; delete bloqueado): `negocio` (relation negocios, obrigatório), `versao` (number), `status` (select: rascunho|gerado|enviado_assinatura|assinado|cancelado — `enviado_assinatura`/`assinado` reservados para a integração ClickSign futura), `conteudo` (text — texto integral do contrato gerado), `dados` (json — variáveis usadas na geração, para reprodutibilidade), `gerado_por` (relation users), `gerado_em` (date), created/updated autodate (AP-2310: autodate explícito).
   - `auditoria.acao`: adicionar `contrato_gerado`.
2. **Hook `contrato_modelo.js`**: template do contrato da Vibratto (9 cláusulas do contrato real da Felicidade — Objeto com implantação+diagnóstico tributário e alçada bancária; Obrigações; Prazo 12 meses com renovação automática; Preço — implantação em 2 parcelas + mensalidade com escalonamento + parcela anual nov + IPCA; Rescisão 30 dias; Sigilo/LGPD; Disposições; Foro SP) com placeholders nomeados. Nenhum dado de cliente no template — só a estrutura.
3. **Hook `contrato_endpoint.js`**:
   - `GET /backend/v1/contratos/{negocioId}` (auth admin|coordenacao): consolidação — dados disponíveis no CRM (negócio: valor, servico, recorrencia, data_ganho; empresa: nome, cnpj; cliente: nome, email, telefone) + lista de versões existentes + completude (o que falta para gerar). Somente leitura.
   - `POST /backend/v1/negocios/{id}/contrato/gerar` (auth admin|coordenacao): gera nova versão do contrato. Valida: negócio existe; estagio = fechado_ganho (contrato só nasce de negócio ganho); dados mínimos informados no corpo (razao_social, cnpj, representantes — preenchidos na UI na hora). Falha → 400 com lista do que falta. Sucesso → cria registro em `contratos` com versao = última+1, conteudo = template preenchido, dados = json das variáveis, status=gerado; auditado (`contrato_gerado`).
   - `GET /backend/v1/contratos/{negocioId}/versao/{versao}` (auth admin|coordenacao): texto integral da versão.
4. **UI `ContratoNegocio.tsx`** (dialog, padrão visual T3.09): entrada no menu "Mais ⌄" da oportunidade (visível quando estagio = fechado_ganho). Abre consolidação (dados do CRM + o que falta) → campos editáveis para as variáveis ausentes (razão social, CNPJ, representantes, condições financeiras pré-preenchidas com valor/recorrência do negócio) → botão "Gerar contrato" → exibe texto integral com botão "Copiar texto" + histórico de versões.
5. **Card/entrada na etapa `preparacao_contrato`**: o botão Contrato fica disponível na oportunidade enquanto ela estiver nessa etapa do pipeline.

## Fora do recorte

- Integração ClickSign (envio, assinatura, status via API) — task seguinte; status `enviado_assinatura`/`assinado` ficam reservados.
- Geração de PDF/DOCX binário — a integração ClickSign cuida do upload do documento; v1 entrega texto (mesmo padrão do e-mail de boas-vindas).
- Envio automático por e-mail.
- Assinatura dentro do CRM.

## Critérios de aceite

- CA-3-070: GET /contratos/{negocioId} consolida dados do CRM e lista o que falta (somente leitura).
- CA-3-071: POST gerar exige estagio fechado_ganho — negócio não ganho → 400.
- CA-3-072: POST gerar sem dados mínimos (razao_social/cnpj/representantes) → 400 com lista clara.
- CA-3-073: geração bem-sucedida cria versão com template preenchido + dados json + auditoria contrato_gerado.
- CA-3-074: 2ª geração cria versao+1 (versionamento; nenhuma versão é sobrescrita ou apagada).
- CA-3-075: GET versão devolve o texto integral; delete bloqueado (append-only).
- CA-3-076: operator 403 em gerar e em ler versões (admin|coordenacao).

## Provas

- RED: 401 sem auth; 403 operator; 400 negócio não ganho; 400 sem dados mínimos; 404 versão inexistente; 403 delete direto na coleção.
- GREEN: consolidação do negócio real Felicidade (valor 8336.11, mensal) com completude; geração v1 com dados preenchidos; geração v2 (versao+1); texto integral 200; auditoria contrato_gerado.
- Regressão: etapa preparacao_contrato no pipeline intacta; ficha/implantação/motor intactos; estado real preservado.

## Decisões pendentes da CEO

- **D15 — variáveis ausentes**: preencher na hora da geração (campos editáveis no diálogo, salvos na versão) — RECOMENDADO — vs. novos campos fixos na empresa.
- **D16 — PDF**: v1 só texto (Copiar texto), PDF entra na integração ClickSign — RECOMENDADO — vs. gerar PDF já nesta task.
- **D17 — permissão**: admin|coordenacao geram; operator só visualiza versões existentes — RECOMENDADO.
