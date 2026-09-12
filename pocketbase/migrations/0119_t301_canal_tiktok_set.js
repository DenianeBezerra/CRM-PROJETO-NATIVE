migrate(
  (app) => {
    // T3.01 — fix definitivo da 0115/0116/0117: TikTok no select `canal`.
    // Sem remove+add (o QA valida o estado final e a recriação não persiste
    // os values no runtime de request). Abordagem: modificar o campo
    // EXISTENTE via field.set("values", ...) — e provar lendo de volta.
    // Se o set não persistir, o log DEPOIS mostrará a lista antiga.
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
      console.log('T301-0119 canal ANTES: ' + JSON.stringify(canal.values || []))
      if (!(canal.values || []).includes('tiktok')) {
        canal.set('values', LISTA)
        app.save(negocios)
        const reLido = app
          .findCollectionByNameOrId('negocios')
          .fields.getByName('canal')
        console.log('T301-0119 canal DEPOIS (relido): ' + JSON.stringify(reLido.values || []))
      } else {
        console.log('T301-0119 canal ja contem tiktok')
      }
    } catch (err) {
      console.log('T301-0119 ERRO: ' + String(err))
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
