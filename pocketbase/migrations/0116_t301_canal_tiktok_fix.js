migrate(
  (app) => {
    // T3.01 — fix da 0115: TikTok no select `canal` de negocios.
    // A 0115 aplicou mas o PATCH canal=tiktok continuou 400. Estratégia:
    // recriar o campo com a lista completa via fields.add(new Field(...)) —
    // o padrão que funcionou na 0110. Idempotente.
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const LISTA = [
        'instagram',
        'linkedin',
        'tiktok',
        'whatsapp',
        'site',
        'google',
        'evento',
        'indicacao',
        'trafego_pago',
        'parceiro',
        'outro',
      ]
      let canal = negocios.fields.getByName('canal')
      console.log('T301-0116 canal ANTES: ' + JSON.stringify(canal.values || []))
      if (!(canal.values || []).includes('tiktok')) {
        negocios.fields.removeByName('canal')
        negocios.fields.add(
          new Field({
            name: 'canal',
            type: 'select',
            values: LISTA,
            maxSelect: 1,
          }),
        )
        app.save(negocios)
        const depois = JSON.stringify(
          app.findCollectionByNameOrId('negocios').fields.getByName('canal').values || [],
        )
        console.log('T301-0116 canal DEPOIS: ' + depois)
      } else {
        console.log('T301-0116 canal ja contem tiktok')
      }
    } catch (err) {
      console.log('T301-0116 ERRO: ' + String(err))
    }
  },
  (app) => {
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const canal = negocios.fields.getByName('canal')
      const semTiktok = (canal.values || []).filter((v) => v !== 'tiktok')
      negocios.fields.removeByName('canal')
      negocios.fields.add(
        new Field({
          name: 'canal',
          type: 'select',
          values: semTiktok,
          maxSelect: 1,
        }),
      )
      app.save(negocios)
    } catch (_) {}
  },
)
