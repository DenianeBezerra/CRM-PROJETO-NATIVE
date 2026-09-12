migrate(
  (app) => {
    // T3.01 — DIAGNÓSTICO: a 0118 não rodou (nunca apareceu na lista de
    // migrations — as versões 0116/0117/0118 foram queimadas por builds
    // com integrations ok:false, e o runner de migrations do Skip não
    // reexecuta). Esta migration usa versão NOVA (0120) e recria o campo
    // canal com a lista completa (TikTok + Página de captura), padrão da
    // 0110 (que funcionou). Idempotente.
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
      let negocios = app.findCollectionByNameOrId('negocios')
      const canal = negocios.fields.getByName('canal')
      console.log('T301-0120 ANTES: ' + JSON.stringify(canal.values || []))
      if (!(canal.values || []).includes('tiktok')) {
        negocios.fields.removeByName('canal')
        app.save(negocios)
        negocios = app.findCollectionByNameOrId('negocios')
        negocios.fields.add(
          new Field({
            name: 'canal',
            type: 'select',
            values: LISTA,
            maxSelect: 1,
          }),
        )
        app.save(negocios)
        const depois = app.findCollectionByNameOrId('negocios').fields.getByName('canal')
        console.log('T301-0120 DEPOIS: ' + JSON.stringify(depois.values || []))
      }
    } catch (err) {
      console.log('T301-0120 ERRO: ' + String(err))
    }
  },
  (app) => {},
)
