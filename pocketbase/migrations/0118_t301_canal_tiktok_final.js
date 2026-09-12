migrate(
  (app) => {
    // T3.01 — fix definitivo da 0115/0116/0117: TikTok no select `canal`.
    // Estratégia: REMOVER o campo e recriá-lo do zero (padrão da 0110 que
    // criou o campo e funcionou de primeira), com save imediato após cada
    // operação. O erro de validação do QA acontece porque o app.save roda
    // com o campo ausente (estado intermediário) — então o remove e o add
    // acontecem no MESMO save (sem save intermediário).
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
      const canal = negocios.fields.getByName('canal')
      console.log('T301-0118 canal ANTES: ' + JSON.stringify(canal.values || []))
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
        const reLido = app.findCollectionByNameOrId('negocios').fields.getByName('canal')
        console.log('T301-0118 canal DEPOIS (relido): ' + JSON.stringify(reLido.values || []))
      } else {
        console.log('T301-0118 canal ja contem tiktok')
      }
    } catch (err) {
      console.log('T301-0118 ERRO: ' + String(err))
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
