migrate(
  (app) => {
    // T3.01 — canal "Comunidade" (ex.: Comunidade Clareza Financeira) na
    // atribuição granular. Mesma técnica provada da 0125: atribuição DIRETA
    // `field.values = array` (não .set(), que não persiste neste runtime).
    // Idempotente. Sem remove+add (o validador do pipeline rejeita).
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const canal = negocios.fields.getByName('canal')
      const atual = (canal.values || []).slice()
      console.log('T301-0128 ANTES: ' + JSON.stringify(atual))
      if (!atual.includes('comunidade')) {
        const idx = atual.indexOf('outro')
        if (idx >= 0) atual.splice(idx, 0, 'comunidade')
        else atual.push('comunidade')
        canal.values = atual // atribuição direta — padrão provado da 0112/0125
        app.save(negocios)
        const depois = app.findCollectionByNameOrId('negocios').fields.getByName('canal')
        console.log('T301-0128 DEPOIS: ' + JSON.stringify(depois.values || []))
      } else {
        console.log('T301-0128 canal ja contem comunidade')
      }
    } catch (err) {
      console.log('T301-0128 ERRO: ' + String(err))
    }
  },
  (app) => {
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const canal = negocios.fields.getByName('canal')
      canal.values = (canal.values || []).filter((v) => v !== 'comunidade')
      app.save(negocios)
    } catch (_) {}
  },
)
