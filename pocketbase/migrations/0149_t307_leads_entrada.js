// T3.07 — Porta 1: formulário de entrada (SPEC-3-006).
// Coleção `leads_entrada` append-only (deleteRule null) + config de limite de
// envios por IP/hora + campos de rastreio na oportunidade (entrada_origem).
// Campos: token (único, 48), nome, email, whatsapp, eh_decisor (bool),
// cnpj, empresa_razao (enriquecimento), faturamento_faixa, qtd_cnpjs,
// colaboradores, regime_tributario, erp_atual, quem_cuida_financeiro,
// dor_principal, dores_secundarias, relato, urgencia, sonho_12m,
// score (number), temperatura (select), utm (json), origem_declarada,
// ip (text), consentimento_lgpd (bool), consentimento_versao,
// consentimento_data, optin_marketing (bool), negocio (relation — vínculo no
// dedup), status (novo|vinculado), trilha (json).
// Lição AP-0200: atribuição direta field.values = [...] (NÃO .set('values')).
migrate(
  (app) => {
    var negocios = app.findCollectionByNameOrId('negocios')
    var existe = true
    try {
      app.findCollectionByNameOrId('leads_entrada')
    } catch (_) {
      existe = false
    }
    if (!existe) {
      var col = new Collection({
        name: 'leads_entrada',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'token', type: 'text', max: 64 },
          { name: 'nome', type: 'text', required: true, max: 200 },
          { name: 'email', type: 'email', required: true },
          { name: 'whatsapp', type: 'text', required: true, max: 30 },
          { name: 'eh_decisor', type: 'bool' },
          { name: 'cnpj', type: 'text', max: 20 },
          { name: 'empresa_razao', type: 'text', max: 200 },
          {
            name: 'faturamento_faixa',
            type: 'select',
            values: ['ate_100k', '100k_500k', '500k_2m', '2m_10m', 'acima_10m', 'nao_sei_informar'],
            maxSelect: 1,
          },
          { name: 'qtd_cnpjs', type: 'number' },
          { name: 'colaboradores', type: 'number' },
          {
            name: 'regime_tributario',
            type: 'select',
            values: ['simples', 'presumido', 'real', 'nao_sei_informar'],
            maxSelect: 1,
          },
          { name: 'erp_atual', type: 'text', max: 120 },
          { name: 'quem_cuida_financeiro', type: 'text', max: 200 },
          {
            name: 'dor_principal',
            type: 'select',
            required: true,
            values: [
              'caixa_sem_previsibilidade',
              'rotina_financeira_atrasada',
              'informacao_confavel_falta',
              'custo_alto_sem_controle',
              'crescimento_sem_estrutura',
              'outro',
            ],
            maxSelect: 1,
          },
          { name: 'dores_secundarias', type: 'text', max: 1000 },
          { name: 'relato', type: 'text', max: 5000 },
          {
            name: 'urgencia',
            type: 'select',
            values: ['imediata', 'este_trimestre', 'este_ano', 'so_informando'],
            maxSelect: 1,
          },
          { name: 'sonho_12m', type: 'text', max: 2000 },
          { name: 'score', type: 'number' },
          {
            name: 'temperatura',
            type: 'select',
            values: ['quente', 'morno', 'frio'],
            maxSelect: 1,
          },
          { name: 'utm', type: 'json', maxSize: 100000 },
          { name: 'origem_declarada', type: 'text', max: 200 },
          { name: 'ip', type: 'text', max: 64 },
          { name: 'consentimento_lgpd', type: 'bool' },
          { name: 'consentimento_versao', type: 'text', max: 40 },
          { name: 'consentimento_data', type: 'date' },
          { name: 'optin_marketing', type: 'bool' },
          {
            name: 'negocio',
            type: 'relation',
            collectionId: negocios.id,
            maxSelect: 1,
          },
          { name: 'status', type: 'select', values: ['novo', 'vinculado'], maxSelect: 1 },
          { name: 'trilha', type: 'json', maxSize: 200000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_leads_entrada_token ON leads_entrada (token)',
          'CREATE INDEX idx_leads_entrada_created ON leads_entrada (created)',
          'CREATE INDEX idx_leads_entrada_temp ON leads_entrada (temperatura)',
        ],
      })
      app.save(col)
    }
    // Config do rate limit (padrão 3 envios/IP/hora) — idempotente.
    var cfgExiste = false
    try {
      var cfgs = app.findRecordsByFilter(
        'configuracoes_operacionais',
        "chave = 'limite_entrada_por_ip_hora'",
        '',
        1,
        0,
      )
      cfgExiste = cfgs.length > 0
    } catch (_) {
      cfgExiste = false
    }
    if (!cfgExiste) {
      var cfgCol = app.findCollectionByNameOrId('configuracoes_operacionais')
      var cfg = new Record(cfgCol)
      cfg.set('chave', 'limite_entrada_por_ip_hora')
      cfg.set('valor_numero', 3)
      cfg.set('descricao', 'Limite de envios do formulário de entrada por IP por hora (anti-spam).')
      app.save(cfg)
    }
    // Campo de rastreio na oportunidade (origem da Porta 1) — idempotente.
    var campos = [
      {
        name: 'entrada_origem',
        type: 'select',
        values: ['formulario_entrada', 'indicacao', 'site', 'redes_sociais', 'evento', 'outro'],
        maxSelect: 1,
      },
    ]
    for (var i = 0; i < campos.length; i++) {
      try {
        negocios.fields.add(new Field(campos[i]))
      } catch (_) {
        /* idempotente */
      }
    }
    app.save(negocios)
  },
  (app) => {
    try {
      var negocios = app.findCollectionByNameOrId('negocios')
      try {
        negocios.fields.removeByName('entrada_origem')
      } catch (_) {}
      app.save(negocios)
      app.delete(app.findCollectionByNameOrId('leads_entrada'))
    } catch (_) {}
  },
)
