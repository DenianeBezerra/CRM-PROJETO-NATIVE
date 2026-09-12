// T3.10 — SPEC-3-010: metas_indicadores (admin-only) + campo recorrencia em
// negocios + seed das metas da CEO (Q3/Q4 2026, EDITÁVEIS sem código).
// metas_indicadores: chave (único), papel (direcao|comercial|controladoria|
// administracao), valor_meta, periodicidade (mensal|semanal|trimestral), ativo,
// descricao. CRUD admin-only; leitura autenticada.
// recorrencia (decisão CEO 13/09): BPO/Tesouraria/Controladoria = 12 meses
// renováveis automaticamente (valor = mensalidade, regra fixa); Consultoria e
// CFO podem ter prazo menor — campo mensal|unico no ganho desses serviços.
// Lição AP-0200: atribuição direta field.values = [...] (NÃO .set('values')).
migrate(
  (app) => {
    var existe = true
    try {
      app.findCollectionByNameOrId('metas_indicadores')
    } catch (_) {
      existe = false
    }
    if (!existe) {
      var col = new Collection({
        name: 'metas_indicadores',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.role = 'admin'",
        updateRule: "@request.auth.role = 'admin'",
        deleteRule: "@request.auth.role = 'admin'",
        fields: [
          { name: 'chave', type: 'text', required: true, max: 80 },
          {
            name: 'papel',
            type: 'select',
            values: ['direcao', 'comercial', 'controladoria', 'administracao'],
            required: true,
            maxSelect: 1,
          },
          { name: 'valor_meta', type: 'number', required: true },
          {
            name: 'periodicidade',
            type: 'select',
            values: ['mensal', 'semanal', 'trimestral'],
            required: true,
            maxSelect: 1,
          },
          { name: 'ativo', type: 'bool' },
          { name: 'descricao', type: 'text', max: 300 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_metas_chave ON metas_indicadores (chave)'],
      })
      app.save(col)
    }

    // Seed das metas da CEO (Q3/Q4 2026) — idempotente, EDITÁVEL pela UI.
    var seeds = [
      {
        chave: 'novos_negocios_mensal',
        papel: 'direcao',
        valor_meta: 2,
        periodicidade: 'mensal',
        descricao: 'Novos clientes padrão CFO assinados por mês (6 até dez/2026).',
      },
      {
        chave: 'diagnosticos_semanal',
        papel: 'direcao',
        valor_meta: 1.5,
        periodicidade: 'semanal',
        descricao: 'Diagnósticos realizados por semana (1 a 2 — média).',
      },
      {
        chave: 'horas_venda_semanal',
        papel: 'direcao',
        valor_meta: 4,
        periodicidade: 'semanal',
        descricao: 'Horas efetivamente dedicadas a vender por semana (bloqueadas na agenda).',
      },
    ]
    for (var i = 0; i < seeds.length; i++) {
      var s = seeds[i]
      var jaTem = false
      try {
        var r = app.findRecordsByFilter('metas_indicadores', "chave = '" + s.chave + "'", '', 1, 0)
        jaTem = r.length > 0
      } catch (_) {
        jaTem = false
      }
      if (!jaTem) {
        var rec = new Record(app.findCollectionByNameOrId('metas_indicadores'))
        rec.set('chave', s.chave)
        rec.set('papel', s.papel)
        rec.set('valor_meta', s.valor_meta)
        rec.set('periodicidade', s.periodicidade)
        rec.set('ativo', true)
        rec.set('descricao', s.descricao)
        app.save(rec)
      }
    }

    // Campo recorrencia em negocios (idempotente).
    var negocios = app.findCollectionByNameOrId('negocios')
    var temCampo = false
    for (var f = 0; f < negocios.fields.length; f++) {
      if (negocios.fields[f].name === 'recorrencia') temCampo = true
    }
    if (!temCampo) {
      negocios.fields.add(
        new Field({
          name: 'recorrencia',
          type: 'select',
          values: ['mensal', 'unico'],
          maxSelect: 1,
        }),
      )
      app.save(negocios)
    }
    // Negócios ganhos existentes: premissa atual = mensal (revisável pela CEO).
    app
      .db()
      .newQuery(
        "UPDATE negocios SET recorrencia = 'mensal' WHERE recorrencia IS NULL OR recorrencia = ''",
      )
      .execute()
  },
  (app) => {
    try {
      var neg = app.findCollectionByNameOrId('negocios')
      try {
        neg.fields.removeByName('recorrencia')
      } catch (_) {}
      app.save(neg)
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('metas_indicadores'))
    } catch (_) {}
  },
)
