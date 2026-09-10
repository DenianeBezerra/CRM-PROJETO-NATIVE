migrate(
  (app) => {
    // T2.02 / CA-2-037 — correção: a migration 0022 criou a coleção empresas e foi
    // marcada como aplicada, mas a conversão de clientes.empresa (text → relation)
    // não persistiu. Esta migration converte o campo e executa o backfill,
    // de forma idempotente.
    const empresasCol = app.findCollectionByNameOrId('empresas')
    const clientes = app.findCollectionByNameOrId('clientes')
    const field = clientes.fields.getByName('empresa')

    if (!field || field.type !== 'relation') {
      // 1. Preserva os textos atuais.
      const existing = app.findRecordsByFilter(clientes, '', '-created', 20000, 0)
      const textos = {}
      for (const c of existing) {
        const t = String(c.get('empresa') || '').trim()
        if (t) textos[c.id] = t
      }

      // 2. Converte o campo para relation.
      if (field) clientes.fields.removeByName('empresa')
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
    // Rollback não destrutivo: a conversão anterior permanece (histórico preservado).
  },
)
