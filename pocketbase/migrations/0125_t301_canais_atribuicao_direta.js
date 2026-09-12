migrate(
  (app) => {
    // T3.01 — fix canais (TikTok + Página de captura) com a técnica que
    // PROVADAMENTE persistiu no caso do `servico` (0112/0113): atribuição
    // DIRETA `field.values = array` (não .set()). A 0115 usou .set() e não
    // persistiu; a 0112 usou atribuição direta e Tesouraria persistiu.
    // Idempotente. Sem remove+add (o validador do pipeline rejeita).
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
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
      const canal = negocios.fields.getByName('canal')
      const atual = (canal.values || []).slice()
      console.log('T301-0125 ANTES: ' + JSON.stringify(atual))
      if (!atual.includes('tiktok') || !atual.includes('pagina_captura')) {
        for (const v of LISTA) {
          if (!atual.includes(v)) {
            const idx = atual.indexOf('outro')
            if (idx >= 0) atual.splice(idx, 0, v)
            else atual.push(v)
          }
        }
        canal.values = atual // atribuição direta — padrão da 0112 (servico)
        app.save(negocios)
        const depois = app.findCollectionByNameOrId('negocios').fields.getByName('canal')
        console.log('T301-0125 DEPOIS: ' + JSON.stringify(depois.values || []))
      }
    } catch (err) {
      console.log('T301-0125 ERRO: ' + String(err))
    }
  },
  (app) => {},
)
