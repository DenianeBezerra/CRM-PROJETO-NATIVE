migrate(
  (app) => {
    // T2.26 — CA-2-021: configuração de SLA por evento/etapa.
    // Admin cria/atualiza; delete bloqueado (append-only de configuração).
    // "Sem alterar histórico anterior": cada configuração tem vigência
    // (inicio/fim); cálculos futuros usam a configuração vigente na data do
    // evento — config antiga permanece no histórico com suas próprias datas.
    if (app.hasTable('sla_config')) return

    const col = new Collection({
      name: 'sla_config',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: null,
      fields: [
        {
          name: 'evento',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: [
            'proposta_emissao',
            'proposta_decisao',
            'tarefa_conclusao',
            'oportunidade_avanco',
          ],
        },
        {
          name: 'etapa',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['todas', 'novo', 'contato_feito', 'proposta'],
        },
        { name: 'prazo_valor', type: 'number', required: true, onlyInt: true, min: 1 },
        {
          name: 'prazo_unidade',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['horas_uteis', 'dias_uteis', 'dias_corridos'],
        },
        {
          name: 'calendario',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['comercial', 'contínuo'],
        },
        { name: 'inicio_vigencia', type: 'date', required: true },
        { name: 'fim_vigencia', type: 'date' },
        { name: 'ativa', type: 'bool' },
        {
          name: 'criado_por',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_sla_evento ON sla_config (evento)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('sla_config'))
    } catch (_) {}
  },
)
