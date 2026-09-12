migrate(
  (app) => {
    // T3.01 — fix definitivo dos canais (TikTok + Página de captura).
    // Histórico: 0115/0116/0117 não alteraram o enum (set('values') e
    // remove+add não surtiram efeito observável no runtime; 0116 ainda
    // falhou na validação do pipeline). A 0110 FUNCIONOU usando
    // fields.add(new Field(...)) em campo INEXISTENTE.
    // Estratégia aqui: recriar o campo com o MESMO padrão da 0110 —
    // removeByName + save + add(new Field) + save, cada passo isolado,
    // com logs em cada etapa. Dado preservado: valores existentes dos
    // registros continuam válidos (instagram/linkedin/indicacao estão na
    // nova lista).
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
      let canal = negocios.fields.getByName('canal')
      console.log('T301-0118 ANTES: ' + JSON.stringify(canal.values || []))
      if (!(canal.values || []).includes('tiktok')) {
        negocios.fields.removeByName('canal')
        app.save(negocios)
        console.log('T301-0118 canal removido')
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
        console.log('T301-0118 DEPOIS: ' + JSON.stringify(depois.values || []))
      }
    } catch (err) {
      console.log('T301-0118 ERRO: ' + String(err))
    }
  },
  (app) => {},
)
