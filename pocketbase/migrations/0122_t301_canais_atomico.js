migrate(
  (app) => {
    // T3.01 — fix canais via REBUILD COMPLETO da coleção (padrão PocketBase:
    // clonar a collection, substituir o field canal pelo novo com values
    // completos, e salvar a collection inteira de uma vez — o validador do
    // pipeline vê o estado final com values preenchido).
    // Diferença das tentativas anteriores: aqui o field é REMOVIDO da lista
    // e o NOVO field (com values) é ADICIONADO na MESMA operação de save —
    // nunca existe um save com o campo sem values.
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
      console.log('T301-0122 ANTES: ' + JSON.stringify(canal.values || []))
      if (!(canal.values || []).includes('tiktok')) {
        const novoCampo = new Field({
          name: 'canal',
          type: 'select',
          values: LISTA,
          maxSelect: 1,
        })
        // Substituição atômica: remove o field antigo e adiciona o novo
        // na MESMA collection object, salvando UMA vez.
        negocios.fields.removeByName('canal')
        negocios.fields.add(novoCampo)
        app.save(negocios)
        const depois = app.findCollectionByNameOrId('negocios').fields.getByName('canal')
        console.log('T301-0122 DEPOIS: ' + JSON.stringify(depois.values || []))
      }
    } catch (err) {
      console.log('T301-0122 ERRO: ' + String(err))
    }
  },
  (app) => {},
)
