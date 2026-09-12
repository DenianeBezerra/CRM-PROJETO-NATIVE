migrate(
  (app) => {
    // T3.01 — fix da 0115: TikTok no select `canal` de negocios.
    // A 0115 aplicou mas o PATCH canal=tiktok continuou 400 (valor antigo
    // 200, valor inválido 400 — comportamento de enum sem o valor novo).
    // Hipótese: no JSVM, `field.set('values', arr)` com array JS comum não
    // persiste; a 0110 (que funcionou) usou `negocios.fields.add(new Field(...))`.
    // Aqui: recriar o campo via add() com a lista completa (idempotente —
    // se falhar porque existe, remover e re-adicionar).
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
      const antes = JSON.stringify(canal.values || [])
      console.log('T301-0116 canal ANTES: ' + antes)
      if (!(canal.values || []).includes('tiktok')) {
        // Tentativa 1: set direto
        try {
          canal.set('values', LISTA)
          app.save(negocios)
          const depois1 = JSON.stringify(
            app.findCollectionByNameOrId('negocios').fields.getByName('canal').values || [],
          )
          console.log('T301-0116 apos set(): ' + depois1)
        } catch (e1) {
          console.log('T301-0116 set() falhou: ' + String(e1))
        }
        // Tentativa 2: remove + add (padrão da 0110 que funcionou)
        canal = app.findCollectionByNameOrId('negocios').fields.getByName('canal')
        if (!(canal.values || []).includes('tiktok')) {
          try {
            app.findCollectionByNameOrId('negocios').fields.removeByName('canal')
            app.save(app.findCollectionByNameOrId('negocios'))
            const col2 = app.findCollectionByNameOrId('negocios')
            col2.fields.add(
              new Field({
                name: 'canal',
                type: 'select',
                values: LISTA,
                maxSelect: 1,
              }),
            )
            app.save(col2)
            const depois2 = JSON.stringify(
              app.findCollectionByNameOrId('negocios').fields.getByName('canal').values || [],
            )
            console.log('T301-0116 apos remove+add: ' + depois2)
          } catch (e2) {
            console.log('T301-0116 remove+add falhou: ' + String(e2))
          }
        }
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
      canal.set(
        'values',
        (canal.values || []).filter((v) => v !== 'tiktok'),
      )
      app.save(negocios)
    } catch (_) {}
  },
)
