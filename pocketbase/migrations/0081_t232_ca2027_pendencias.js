migrate(
  (app) => {
    // T2.32 — CA-2-027: pendências de aceite do handoff.
    // Novo campo `pendencias` (JSON) na coleção handoffs: lista de
    // { item, dono, prazo, criado_em, resolvida_em } gerada quando o receptor
    // tenta aceitar com item obrigatório pendente. Sem regra de coleção nova —
    // o aceite é server-side (endpoint da T2.32/T2.33), não via API direta.
    const col = app.findCollectionByNameOrId('handoffs')
    const jaTem = col.fields.some(function (f) {
      return f.name === 'pendencias'
    })
    const novos = [
      { name: 'pendencias', type: 'json' },
      {
        name: 'aceito_por',
        type: 'relation',
        collectionId: app.findCollectionByNameOrId('users').id,
        maxSelect: 1,
      },
      { name: 'aceito_em', type: 'date' },
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
    if (mudou) {
      app.save(col)
    }
  },
  (app) => {
    // Down: remove os campos adicionados (best-effort).
    const col = app.findCollectionByNameOrId('handoffs')
    let mudou = false
    ;['pendencias', 'aceito_por', 'aceito_em'].forEach(function (nome) {
      const tem = col.fields.some(function (f) {
        return f.name === nome
      })
      if (tem) {
        col.fields.removeByName(nome)
        mudou = true
      }
    })
    if (mudou) app.save(col)
  },
)
