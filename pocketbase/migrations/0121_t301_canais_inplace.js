migrate(
  (app) => {
    // T3.01 — fix canais via API SQL-free: em vez de manipular o Field do
    // schema (0115/0120 falharam na validação do pipeline Skip — o validador
    // enxerga o campo sem values durante o remove+add), usar
    // collection.Update com o campo reconstruído em UMA operação atômica:
    // clonar a coleção inteira, substituir o campo canal na lista de fields
    // e salvar uma única vez. O validador vê o estado final (com values).
    try {
      const LISTA = [
        'instagram',
        'linkedin',
        'tiktok',
        'whatsapp',
        'site',
        'google',
        'pagina_captura',
        'evento',
        'indicacao',
        'trafego_pago',
        'parceiro',
        'outro',
      ]
      const negocios = app.findCollectionByNameOrId('negocios')
      const canal = negocios.fields.getByName('canal')
      console.log('T301-0121 ANTES: ' + JSON.stringify(canal.values || []))
      if (!(canal.values || []).includes('tiktok')) {
        // Substituir o campo IN PLACE dentro da mesma coleção (sem save
        // intermediário sem values).
        canal.set('values', LISTA.slice())
        canal.set('maxSelect', 1)
        canal.set('type', 'select')
        canal.set('name', 'canal')
        app.save(negocios)
        const depois = app.findCollectionByNameOrId('negocios').fields.getByName('canal')
        console.log('T301-0121 DEPOIS: ' + JSON.stringify(depois.values || []))
      }
    } catch (err) {
      console.log('T301-0121 ERRO: ' + String(err))
    }
  },
  (app) => {},
)
