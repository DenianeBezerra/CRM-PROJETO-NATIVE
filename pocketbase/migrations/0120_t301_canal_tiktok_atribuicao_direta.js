migrate(
  (app) => {
    // T3.01 — fix definitivo do canal TikTok (0120).
    // Lição comparada: para `servico`, a migration 0112 usou ATRIBUIÇÃO DIRETA
    // (field.values = arr) e persistiu (PATCH tesouraria 200 após fix do hook);
    // para `canal`, todas as tentativas usaram field.set('values', ...) — que
    // NÃO persiste neste runtime. Aqui: atribuição direta, o padrão provado.
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
      console.log('T301-0120 canal ANTES: ' + JSON.stringify(canal.values || []))
      if (!(canal.values || []).includes('tiktok')) {
        canal.values = LISTA
        app.save(negocios)
        const reLido = app.findCollectionByNameOrId('negocios').fields.getByName('canal')
        console.log('T301-0120 canal DEPOIS (relido): ' + JSON.stringify(reLido.values || []))
      } else {
        console.log('T301-0120 canal ja contem tiktok')
      }
    } catch (err) {
      console.log('T301-0120 ERRO: ' + String(err))
    }
  },
  (app) => {
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const canal = negocios.fields.getByName('canal')
      canal.values = (canal.values || []).filter((v) => v !== 'tiktok')
      app.save(negocios)
    } catch (_) {}
  },
)
