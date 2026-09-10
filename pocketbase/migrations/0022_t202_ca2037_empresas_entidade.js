migrate(
  (app) => {
    // T2.02 / CA-2-037 — Opção A aprovada pela cliente/consultora em 2026-09-10:
    // empresa passa a ser entidade relacional própria (coleção empresas),
    // clientes.empresa vira relation e o texto existente é normalizado via backfill.
    // Aceite registrado no changelog e em evidencias/spec-2-000/ca-2-037-green.md.

    // 1. Coleção empresas (idempotente).
    let empresasCol
    try {
      empresasCol = app.findCollectionByNameOrId('empresas')
    } catch (_) {
      empresasCol = new Collection({
        name: 'empresas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != '' && @request.auth.role = 'admin'",
        fields: [
          { name: 'nome', type: 'text', required: true, max: 200 },
          { name: 'cnpj', type: 'text', max: 20 },
          { name: 'setor', type: 'text', max: 120 },
          { name: 'observacoes', type: 'text', max: 1000 },
          {
            name: 'status',
            type: 'select',
            maxSelect: 1,
            values: ['ativa', 'inativa', 'prospect'],
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_empresas_nome ON empresas (nome)'],
      })
      app.save(empresasCol)
    }

    // 2. clientes.empresa: text → relation (preserva o texto em empresa_texto).
    const clientes = app.findCollectionByNameOrId('clientes')
    const empresaField = clientes.fields.getByName('empresa')
    if (empresaField && empresaField.type === 'text') {
      // guarda o texto original para o backfill
      const existing = app.findRecordsByFilter(clientes, '', '-created', 20000, 0)
      const textos = {}
      for (const c of existing) {
        const t = String(c.get('empresa') || '').trim()
        if (t) textos[c.id] = t
      }
      clientes.fields.removeByName('empresa')
      clientes.fields.add(
        new Field({
          name: 'empresa',
          type: 'relation',
          required: false,
          collectionId: empresasCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
      app.save(clientes)

      // 3. Backfill: normaliza cada texto distinto em um registro de empresa.
      const porNome = {}
      for (const [clienteId, texto] of Object.entries(textos)) {
        let empresaId = porNome[texto]
        if (!empresaId) {
          let found = null
          try {
            found = app.findFirstRecordByFilter(empresasCol, 'nome = {:n}', '', { n: texto })
          } catch (_) {
            found = null
          }
          if (found) {
            empresaId = found.id
          } else {
            const rec = new Record(empresasCol)
            rec.set('nome', texto)
            rec.set('status', 'ativa')
            app.save(rec)
            empresaId = rec.id
          }
          porNome[texto] = empresaId
        }
        const cliente = app.findRecordById('clientes', clienteId)
        cliente.set('empresa', empresaId)
        app.save(cliente)
      }
    }
  },
  (app) => {
    // Rollback: restaura clientes.empresa como texto (a partir do nome da empresa
    // vinculada) e remove a coleção empresas.
    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      const field = clientes.fields.getByName('empresa')
      if (field && field.type === 'relation') {
        const existing = app.findRecordsByFilter(clientes, '', '-created', 20000, 0)
        const textos = {}
        for (const c of existing) {
          const rel = c.get('empresa')
          if (rel) {
            try {
              const emp = app.findRecordById('empresas', String(rel))
              textos[c.id] = emp.get('nome')
            } catch (_) {}
          }
        }
        clientes.fields.removeByName('empresa')
        clientes.fields.add(new Field({ name: 'empresa', type: 'text', max: 200 }))
        app.save(clientes)
        for (const [clienteId, texto] of Object.entries(textos)) {
          const c = app.findRecordById('clientes', clienteId)
          c.set('empresa', texto)
          app.save(c)
        }
      }
      try {
        const empresasCol = app.findCollectionByNameOrId('empresas')
        app.delete(empresasCol)
      } catch (_) {}
    } catch (_) {}
  },
)
