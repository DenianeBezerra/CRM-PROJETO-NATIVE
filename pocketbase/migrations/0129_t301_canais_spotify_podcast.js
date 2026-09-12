migrate(
  (app) => {
    // T3.01 — canais "Spotify" e "Podcast" na atribuição granular (pedido da
    // CEO em 12/09: comunidades, Spotify e podcast como fontes de aquisição).
    // Técnica provada da 0125/0128: atribuição DIRETA `field.values = array`.
    // Idempotente. Sem remove+add (o validador do pipeline rejeita).
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const canal = negocios.fields.getByName('canal')
      const atual = (canal.values || []).slice()
      console.log('T301-0129 ANTES: ' + JSON.stringify(atual))
      const faltando = ['spotify', 'podcast'].filter((v) => !atual.includes(v))
      if (faltando.length > 0) {
        for (const v of faltando) {
          const idx = atual.indexOf('outro')
          if (idx >= 0) atual.splice(idx, 0, v)
          else atual.push(v)
        }
        canal.values = atual // atribuição direta — padrão provado da 0112/0125/0128
        app.save(negocios)
        const depois = app.findCollectionByNameOrId('negocios').fields.getByName('canal')
        console.log('T301-0129 DEPOIS: ' + JSON.stringify(depois.values || []))
      } else {
        console.log('T301-0129 canal ja contem spotify e podcast')
      }
    } catch (err) {
      console.log('T301-0129 ERRO: ' + String(err))
    }
  },
  (app) => {
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const canal = negocios.fields.getByName('canal')
      canal.values = (canal.values || []).filter((v) => v !== 'spotify' && v !== 'podcast')
      app.save(negocios)
    } catch (_) {}
  },
)
