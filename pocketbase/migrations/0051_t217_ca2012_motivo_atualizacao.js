migrate(
  (app) => {
    // T2.17 — CA-2-012: motivo da atualização do diagnóstico.
    // Obrigatório a partir da versão 2 (a v1 é a criação, não tem motivo).
    // A obrigatoriedade da v2+ é validada no hook (a v1 é criada sem motivo).
    const col = app.findCollectionByNameOrId('diagnosticos')
    if (col.fields.getByName('motivo_atualizacao')) return
    col.fields.add(
      new Field({
        name: 'motivo_atualizacao',
        type: 'text',
        required: false,
        max: 1000,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('diagnosticos')
    try {
      col.fields.removeByName('motivo_atualizacao')
      app.save(col)
    } catch (_) {}
  },
)
