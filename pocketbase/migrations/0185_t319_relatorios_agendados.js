// T3.19 — SPEC-3-019: relatórios salvos e agendados por e-mail (backlog Etapa 3 §2.3).
// Coleção relatorios_agendados (config, admin via endpoint) + auditoria.acao += relatorio_enviado.
// Lições aplicadas: coleção nova = save vazio + fields.add (0168); autodate created/updated
// explícitos (0169); field.values = [...] direto (AP-0200); índice após campos (0168).
migrate(
  (app) => {
    var existe = true
    try {
      app.findCollectionByNameOrId('relatorios_agendados')
    } catch (_) {
      existe = false
    }
    if (!existe) {
      var users = app.findCollectionByNameOrId('users')
      var col = new Collection({
        name: 'relatorios_agendados',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [],
      })
      app.save(col)
      col.fields.add(new TextField({ name: 'nome', required: true, max: 120 }))
      col.fields.add(
        new SelectField({ name: 'tipo', required: true, maxSelect: 1, values: ['resumo_direcao'] }),
      )
      col.fields.add(
        new SelectField({
          name: 'periodicidade',
          required: true,
          maxSelect: 1,
          values: ['semanal', 'mensal'],
        }),
      )
      col.fields.add(new NumberField({ name: 'dia_semana', onlyInt: true, min: 1, max: 7 }))
      col.fields.add(new NumberField({ name: 'hora_utc', onlyInt: true, min: 0, max: 23 }))
      col.fields.add(new TextField({ name: 'destinatarios', required: true, max: 2000 }))
      col.fields.add(new BoolField({ name: 'ativo', required: true }))
      col.fields.add(
        new RelationField({
          name: 'criado_por',
          required: false,
          maxSelect: 1,
          collectionId: users.id,
        }),
      )
      col.fields.add(new DateField({ name: 'ultimo_envio_em' }))
      col.fields.add(
        new SelectField({
          name: 'ultimo_status',
          required: false,
          maxSelect: 1,
          values: ['pendente', 'enviado', 'falhou'],
        }),
      )
      col.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
      col.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
      col.indexes = ['CREATE INDEX idx_relatorios_ativo ON relatorios_agendados (ativo)']
      app.save(col)
    }

    // auditoria: nova ação relatorio_enviado
    var au = app.findCollectionByNameOrId('auditoria')
    var campoAcao = au.fields.getByName('acao')
    var valores = campoAcao.values || []
    if (valores.indexOf('relatorio_enviado') < 0) {
      valores.push('relatorio_enviado')
      campoAcao.values = valores
      app.save(au)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('relatorios_agendados'))
    } catch (_) {}
  },
)
