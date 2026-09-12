migrate(
  (app) => {
    // T3.01 — canal TikTok adicionado à atribuição granular (pedido da
    // cliente, 12/09). Idempotente: só adiciona se não existir.
    // Nota AP-2026-09-12-0200: hooks que validam canal não foram encontrados
    // (ganho_motivo_rules e commercial_contract não validam canal) — a
    // validação real aqui é o próprio select do schema.
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const canal = negocios.fields.getByName('canal')
      const atual = (canal.values || []).slice()
      if (!atual.includes('tiktok')) {
        const idx = atual.indexOf('outro')
        if (idx >= 0) atual.splice(idx, 0, 'tiktok')
        else atual.push('tiktok')
        canal.set('values', atual)
        app.save(negocios)
        console.log(
          'T301 canal tiktok ADICIONADO: ' +
            JSON.stringify(
              app.findCollectionByNameOrId('negocios').fields.getByName('canal').values || [],
            ),
        )
      }
    } catch (err) {
      console.log('T301 canal tiktok: ' + String(err))
    }
  },
  (app) => {
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const canal = negocios.fields.getByName('canal')
      canal.set(
        'values',
        (canal.values || []).filter((v) => v !== 'tiktok'),
      )
      app.save(negocios)
    } catch (_) {}
  },
)
