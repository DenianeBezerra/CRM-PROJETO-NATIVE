migrate(
  (app) => {
    // T3.01 — fix canais: usar a MESMA técnica da 0110 que FUNCIONOU —
    // fields.add(new Field(...)) — mas com o campo canal REMOVIDO primeiro
    // via removeByName e SEM save intermediário problemático. A diferença
    // da 0122: aqui removo TODOS os campos novos T301 de uma vez e os
    // re-adiciono (padrão exato do down da 0110, que provadamente funciona
    // no sentido inverso). Se o down da 0110 remove e o up re-adiciona,
    // o mesmo ciclo no up deve persistir.
    // PLUS: grava o estado do canal em `diagnostico_t301` (coleção criada
    // na 0123, admin-only) para leitura via superuser depois.
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
      console.log('T301-0124 ANTES: ' + JSON.stringify(canal.values || []))
      if (!(canal.values || []).includes('tiktok')) {
        // Ciclo completo remove → save → add → save (o mesmo que o down da
        // 0110 + up da 0110, que funcionou na criação original).
        negocios.fields.removeByName('canal')
        app.save(negocios)
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
        const depois = app.findCollectionByNameOrId('negocios').fields.getByName('canal')
        const estadoDepois = JSON.stringify(depois.values || [])
        console.log('T301-0124 DEPOIS: ' + estadoDepois)
        // Registrar o resultado no diagnostico_t301 (se existir)
        try {
          const diag = app.findCollectionByNameOrId('diagnostico_t301')
          const rec = new Record(diag)
          rec.set('titulo', 'pos-0124')
          rec.set('payload', estadoDepois)
          app.save(rec)
        } catch (_) {}
      }
    } catch (err) {
      console.log('T301-0124 ERRO: ' + String(err))
    }
  },
  (app) => {},
)
