// T3.22 — SPEC-3-022 (tipo 1): coleção importacoes_lotes + valor 'migracao' em entrada_origem.
// Lote identifica a importação e permite desfazer integralmente. Delete bloqueado.
// Lição AP-0200: atribuição direta field.values = [...] (NÃO .set('values')).
migrate(
  (app) => {
    var users = app.findCollectionByNameOrId('users')

    var existe = true
    try {
      app.findCollectionByNameOrId('importacoes_lotes')
    } catch (_) {
      existe = false
    }
    if (!existe) {
      var col = new Collection({
        name: 'importacoes_lotes',
        type: 'base',
        listRule: "@request.auth.id != '' && @request.auth.role != 'social_media'",
        viewRule: "@request.auth.id != '' && @request.auth.role != 'social_media'",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'tipo',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['tipo1_clientes_ativos', 'tipo2_prospeccao', 'tipo3_linkedin'],
          },
          { name: 'arquivo_nome', type: 'text', required: true, max: 300 },
          { name: 'origem_base', type: 'text', max: 500 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['aplicado', 'desfeito'],
          },
          { name: 'contagens', type: 'json' },
          { name: 'criados', type: 'json' },
          { name: 'atualizados', type: 'json' },
          { name: 'ignorados', type: 'json' },
          { name: 'criado_por', type: 'relation', collectionId: users.id, maxSelect: 1 },
          { name: 'desfeito_em', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_lotes_tipo ON importacoes_lotes (tipo, status)'],
      })
      app.save(col)
      // autodate explícitos (lição 0169: sort -created precisa dos campos)
      var recol = app.findCollectionByNameOrId('importacoes_lotes')
      var temCreated = false
      var temUpdated = false
      for (var i = 0; i < recol.fields.length; i++) {
        if (recol.fields[i].name === 'created') temCreated = true
        if (recol.fields[i].name === 'updated') temUpdated = true
      }
      if (!temCreated) {
        recol.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
      }
      if (!temUpdated) {
        recol.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
      }
      app.save(recol)
    }

    // ---- negocios.entrada_origem ganha o valor 'migracao' ----
    var neg = app.findCollectionByNameOrId('negocios')
    for (var j = 0; j < neg.fields.length; j++) {
      if (neg.fields[j].name === 'entrada_origem') {
        var vals = neg.fields[j].values || []
        if (vals.indexOf('migracao') < 0) vals.push('migracao')
        neg.fields[j].values = vals
      }
    }
    app.save(neg)

    // ---- auditoria.acao ganha 'importacao' e 'importacao_desfeita' ----
    var aud = app.findCollectionByNameOrId('auditoria')
    for (var k = 0; k < aud.fields.length; k++) {
      if (aud.fields[k].name === 'acao') {
        var av = aud.fields[k].values || []
        var novos = ['importacao', 'importacao_desfeita']
        for (var m = 0; m < novos.length; m++) {
          if (av.indexOf(novos[m]) < 0) av.push(novos[m])
        }
        aud.fields[k].values = av
      }
    }
    app.save(aud)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('importacoes_lotes'))
    } catch (_) {}
  },
)
