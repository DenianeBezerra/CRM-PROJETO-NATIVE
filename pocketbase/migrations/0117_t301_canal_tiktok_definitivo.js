migrate(
  (app) => {
    // T3.01 — fix definitivo da 0115/0116: TikTok no select `canal`.
    // Diagnóstico: a 0116 (remove+add com Field) rodou SEM erro de integração
    // (v0.0.387), mas o PATCH canal=tiktok continua 400 enquanto valores
    // antigos dão 200 — o enum efetivo não mudou. Hipótese restante: o
    // PocketBase valida select contra o schema PERSISTIDO e a recriação via
    // Field() não persistiu os values. Abordagem final: modificar o campo
    // EXISTENTE via field.set("values", ...) com app.save — e PROVAR lendo
    // o campo de volta do banco dentro da própria migration.
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
      console.log('T301-0117 canal ANTES: ' + JSON.stringify(canal.values || []))
      if (!(canal.values || []).includes('tiktok')) {
        canal.set('values', LISTA)
        app.save(negocios)
        // Prova interna: reler do banco
        const reLido = app.findCollectionByNameOrId('negocios').fields.getByName('canal')
        console.log('T301-0117 canal DEPOIS (relido): ' + JSON.stringify(reLido.values || []))
      } else {
        console.log('T301-0117 canal ja contem tiktok')
      }
    } catch (err) {
      console.log('T301-0117 ERRO: ' + String(err))
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
