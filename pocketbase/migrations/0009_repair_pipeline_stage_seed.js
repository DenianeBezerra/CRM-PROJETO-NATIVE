migrate(
  (app) => {
    const etapas = app.findCollectionByNameOrId('etapas_negocio')
    const seed = [
      ['novo', 'Novo', 10],
      ['contato_feito', 'Contato feito', 20],
      ['proposta', 'Proposta', 30],
      ['fechado_ganho', 'Fechado ganho', 40],
      ['fechado_perdido', 'Fechado perdido', 50],
    ]

    for (const [chave, nome, ordem] of seed) {
      let existing = null
      try {
        existing = app.findFirstRecordByData('etapas_negocio', 'chave', chave)
      } catch (_) {}
      if (existing) continue

      const record = new Record(etapas)
      record.set('chave', chave)
      record.set('nome', nome)
      record.set('ordem', ordem)
      record.set('ativa', true)
      record.set('sistema', true)
      app.save(record)
    }
  },
  (app) => {
    // Seed repair is intentionally non-destructive: existing records are preserved.
  },
)
