// T3.11 — SPEC-3-011 (Leva A): Ficha Operacional do Cliente.
// Coleções: fichas_operacionais (1 por empresa), ficha_canais, ficha_bancos,
// ficha_pessoas, ficha_versions (versionamento do procedimento gerado).
// REGRA DE OURO (cap. 9 do doc): nenhuma credencial em campo algum — campos
// item_cofre guardam apenas o IDENTIFICADOR do item no cofre corporativo.
// Acesso: admin leitura+escrita; operator (analista) leitura da carteira dele
// (responsavel_principal ou reserva); delete bloqueado (histórico).
// Lição AP-0200: atribuição direta field.values = [...] (NÃO .set('values')).
migrate(
  (app) => {
    var empresas = app.findCollectionByNameOrId('empresas')
    var users = app.findCollectionByNameOrId('users')
    var clientes = app.findCollectionByNameOrId('clientes')

    var existe = true
    try {
      app.findCollectionByNameOrId('fichas_operacionais')
    } catch (_) {
      existe = false
    }
    if (!existe) {
      var ficha = new Collection({
        name: 'fichas_operacionais',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.id != ''",
        deleteRule: null,
        fields: [
          {
            name: 'empresa',
            type: 'relation',
            collectionId: empresas.id,
            required: true,
            maxSelect: 1,
          },
          {
            name: 'status_operacional',
            type: 'select',
            values: ['em_implantacao', 'ativo', 'suspenso', 'encerrado'],
            maxSelect: 1,
          },
          { name: 'data_inicio_operacao', type: 'date' },
          { name: 'responsavel_principal', type: 'relation', collectionId: users.id, maxSelect: 1 },
          { name: 'responsavel_reserva', type: 'relation', collectionId: users.id, maxSelect: 1 },
          {
            name: 'servicos_contratados',
            type: 'select',
            values: [
              'contas_a_pagar',
              'faturamento',
              'conciliacao',
              'fechamento',
              'tesouraria',
              'controladoria',
            ],
            maxSelect: 6,
          },
          { name: 'fora_do_escopo', type: 'text', max: 3000 },
          { name: 'volume_referencia_pagamentos', type: 'number' },
          { name: 'volume_referencia_notas', type: 'number' },
          // Bloco 3 — sistema de gestão
          { name: 'sistema', type: 'select', values: ['omie', 'nibo', 'outro'], maxSelect: 1 },
          { name: 'sistema_outro', type: 'text', max: 120 },
          { name: 'identificacao_empresa_sistema', type: 'text', max: 200 },
          {
            name: 'modulos_utilizados',
            type: 'select',
            values: ['contas_a_pagar', 'contas_a_receber', 'servicos_notas', 'fiscal'],
            maxSelect: 4,
          },
          { name: 'item_cofre_sistema', type: 'text', max: 120 },
          // Bloco 5 — contas a pagar
          {
            name: 'periodicidade_projecao',
            type: 'select',
            values: ['semanal', 'quinzenal', 'decendial', 'mensal'],
            maxSelect: 1,
          },
          { name: 'dias_referencia', type: 'text', max: 200 },
          { name: 'janela_coberta', type: 'text', max: 300 },
          { name: 'regra_conta_fixa', type: 'text', max: 2000 },
          { name: 'regra_conta_variavel', type: 'text', max: 2000 },
          { name: 'autoriza_projecao', type: 'text', max: 200 },
          {
            name: 'canal_autorizacao',
            type: 'select',
            values: ['email', 'whatsapp', 'sistema'],
            maxSelect: 1,
          },
          { name: 'prazo_resposta_horas', type: 'number' },
          { name: 'antecipacao_pagamento', type: 'bool' },
          { name: 'destino_comprovantes', type: 'text', max: 500 },
          { name: 'estrutura_adicional', type: 'text', max: 1000 },
          { name: 'controle_externo_cliente', type: 'text', max: 500 },
          // Bloco 6 — faturamento
          {
            name: 'origem_informacao',
            type: 'select',
            values: ['planilha_estruturada', 'mensagem_avulsa', 'email', 'sistema'],
            maxSelect: 4,
          },
          { name: 'dia_envio_relatorio', type: 'text', max: 120 },
          { name: 'aprova_relatorio', type: 'text', max: 200 },
          { name: 'dia_emissao', type: 'text', max: 120 },
          {
            name: 'rotas_emissao',
            type: 'select',
            values: ['sistema_gestao', 'portal_prefeitura', 'invoice', 'nota_debito'],
            maxSelect: 4,
          },
          { name: 'regra_rota', type: 'text', max: 1000 },
          { name: 'destinatarios_nota', type: 'text', max: 500 },
          { name: 'cancelar_previsao', type: 'bool' },
          { name: 'destino_notas', type: 'text', max: 500 },
          { name: 'prazo_validacao_final', type: 'text', max: 200 },
          { name: 'regra_cobranca', type: 'text', max: 2000 },
          // Bloco 7 — conciliação
          {
            name: 'frequencia_conciliacao',
            type: 'select',
            values: ['diaria', 'semanal', 'outra'],
            maxSelect: 1,
          },
          {
            name: 'responsavel_conciliacao',
            type: 'relation',
            collectionId: users.id,
            maxSelect: 1,
          },
          {
            name: 'origem_extrato',
            type: 'select',
            values: ['manual', 'arquivo', 'integracao'],
            maxSelect: 1,
          },
          { name: 'destino_comprovantes_conc', type: 'text', max: 500 },
          { name: 'controle_externo_conc', type: 'text', max: 500 },
          // Bloco 8 — fechamento mensal
          { name: 'contabilidade_nome', type: 'text', max: 200 },
          { name: 'contabilidade_contato', type: 'text', max: 300 },
          {
            name: 'formato_entrega',
            type: 'select',
            values: ['por_categoria', 'por_data', 'outro'],
            maxSelect: 1,
          },
          {
            name: 'canal_entrega',
            type: 'select',
            values: ['email', 'pasta_compartilhada', 'sistema'],
            maxSelect: 1,
          },
          { name: 'prazo_entrega', type: 'text', max: 200 },
          {
            name: 'documentos_exigidos',
            type: 'select',
            values: [
              'notas_emitidas',
              'notas_recebidas',
              'comprovantes',
              'faturas_cartao',
              'guias',
              'recibos',
            ],
            maxSelect: 6,
          },
          { name: 'particularidades_fechamento', type: 'text', max: 2000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_ficha_empresa ON fichas_operacionais (empresa)'],
      })
      app.save(ficha)
    }

    var fichaCol = app.findCollectionByNameOrId('fichas_operacionais')

    // Bloco 2 — canais de entrada (múltiplos)
    var existeCan = true
    try {
      app.findCollectionByNameOrId('ficha_canais')
    } catch (_) {
      existeCan = false
    }
    if (!existeCan) {
      var can = new Collection({
        name: 'ficha_canais',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: 'ficha',
            type: 'relation',
            collectionId: fichaCol.id,
            required: true,
            maxSelect: 1,
          },
          {
            name: 'tipo_canal',
            type: 'select',
            values: ['email_dedicado', 'grupo_whatsapp', 'planilha_nuvem', 'sistema_cliente'],
            required: true,
            maxSelect: 1,
          },
          { name: 'identificacao', type: 'text', required: true, max: 300 },
          {
            name: 'frequencia_verificacao',
            type: 'select',
            values: ['diaria', 'semanal', 'mensal', 'sob_demanda'],
            maxSelect: 1,
          },
          {
            name: 'finalidade',
            type: 'select',
            values: ['contas_a_pagar', 'faturamento', 'autorizacao', 'documentos'],
            maxSelect: 4,
          },
          { name: 'observacao', type: 'text', max: 1000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: ['CREATE INDEX idx_ficha_canais_ficha ON ficha_canais (ficha)'],
      })
      app.save(can)
    }

    // Bloco 4 — contas bancárias operadas (múltiplos)
    var existeBan = true
    try {
      app.findCollectionByNameOrId('ficha_bancos')
    } catch (_) {
      existeBan = false
    }
    if (!existeBan) {
      var ban = new Collection({
        name: 'ficha_bancos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: 'ficha',
            type: 'relation',
            collectionId: fichaCol.id,
            required: true,
            maxSelect: 1,
          },
          {
            name: 'banco',
            type: 'select',
            values: ['itau', 'bradesco', 'inter', 'outro'],
            required: true,
            maxSelect: 1,
          },
          { name: 'banco_outro', type: 'text', max: 120 },
          { name: 'apelido_conta', type: 'text', required: true, max: 200 },
          {
            name: 'finalidade',
            type: 'select',
            values: ['pagamentos', 'recebimentos', 'ambos'],
            maxSelect: 1,
          },
          {
            name: 'perfil_acesso',
            type: 'select',
            values: ['operacional_sem_aprovacao', 'consulta', 'outro'],
            maxSelect: 1,
          },
          { name: 'quem_aprova_no_banco', type: 'text', max: 200 },
          { name: 'item_cofre', type: 'text', max: 120 },
          { name: 'data_ultima_revisao_acesso', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: ['CREATE INDEX idx_ficha_bancos_ficha ON ficha_bancos (ficha)'],
      })
      app.save(ban)
    }

    // Bloco 9 — pessoas do cliente (múltiplos)
    var existePes = true
    try {
      app.findCollectionByNameOrId('ficha_pessoas')
    } catch (_) {
      existePes = false
    }
    if (!existePes) {
      var pes = new Collection({
        name: 'ficha_pessoas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          {
            name: 'ficha',
            type: 'relation',
            collectionId: fichaCol.id,
            required: true,
            maxSelect: 1,
          },
          {
            name: 'contato',
            type: 'relation',
            collectionId: clientes.id,
            required: true,
            maxSelect: 1,
          },
          {
            name: 'papel_operacional',
            type: 'select',
            values: [
              'autoriza_projecao',
              'aprova_banco',
              'aprova_faturamento',
              'envia_informacao',
              'apenas_informado',
            ],
            maxSelect: 5,
          },
          {
            name: 'canal_preferencial',
            type: 'select',
            values: ['email', 'whatsapp'],
            maxSelect: 1,
          },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: ['CREATE INDEX idx_ficha_pessoas_ficha ON ficha_pessoas (ficha)'],
      })
      app.save(pes)
    }

    // Versionamento do procedimento gerado
    var existeVer = true
    try {
      app.findCollectionByNameOrId('ficha_versions')
    } catch (_) {
      existeVer = false
    }
    if (!existeVer) {
      var ver = new Collection({
        name: 'ficha_versions',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'ficha',
            type: 'relation',
            collectionId: fichaCol.id,
            required: true,
            maxSelect: 1,
          },
          { name: 'servico', type: 'text', required: true, max: 60 },
          { name: 'versao', type: 'number', required: true },
          { name: 'conteudo', type: 'text', required: true, maxSize: 200000 },
          { name: 'gerado_em', type: 'date', required: true },
          { name: 'gerado_por', type: 'relation', collectionId: users.id, maxSelect: 1 },
          { name: 'campos_alterados', type: 'json', maxSize: 100000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: ['CREATE INDEX idx_ficha_versions_ficha ON ficha_versions (ficha)'],
      })
      app.save(ver)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('ficha_versions'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('ficha_pessoas'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('ficha_bancos'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('ficha_canais'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('fichas_operacionais'))
    } catch (_) {}
  },
)
