migrate(
  (app) => {
    // T2.33 — CA-2-028: decisão do receptor (aceitar ou devolver) com ator,
    // data, motivo e snapshot do checklist/pendências no momento da decisão.
    const col = app.findCollectionByNameOrId('handoffs')
    const novos = [
      {
        name: 'devolvido_por',
        type: 'relation',
        collectionId: app.findCollectionByNameOrId('users').id,
        maxSelect: 1,
      },
      { name: 'devolvido_em', type: 'date' },
      { name: 'motivo_devolucao', type: 'text' },
      { name: 'snapshot_decisao', type: 'json' },
    ]
    let mudou = false
    for (let i = 0; i < novos.length; i++) {
      const def = novos[i]
      const existe = col.fields.some(function (f) {
        return f.name === def.name
      })
      if (!existe) {
        col.fields.add(
          new Field({
            name: def.name,
            type: def.type,
            collectionId: def.collectionId,
            maxSelect: def.maxSelect,
          }),
        )
        mudou = true
      }
    }
    if (mudou) app.save(col)
  },
  (app) => {
    // Down: remove os campos adicionados (best-effort).
    const col = app.findCollectionByNameOrId('handoffs')
    let mudou = false
    ;['devolvido_por', 'devolvido_em', 'motivo_devolucao', 'snapshot_decisao'].forEach(
      function (nome) {
        const tem = col.fields.some(function (f) {
          return f.name === nome
        })
        if (tem) {
          col.fields.removeByName(nome)
          mudou = true
        }
      },
    )
    if (mudou) app.save(col)
  },
)
