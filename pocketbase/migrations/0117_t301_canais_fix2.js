migrate(
  (app) => {
    // T3.01 — fix definitivo dos canais (TikTok + Página de captura).
    // A 0116 falhou na validação do Skip (remove+add deixa o campo sem values
    // em algum ponto do pipeline). Estratégia segura: NÃO remover o campo —
    // apenas logar o estado atual e instruir via hook de bootstrap? Não.
    // Solução: usar set('values') no campo EXISTENTE com array novo (a 0116
    // provou que set() não persistiu, mas a 0112 provou que o problema era
    // outro: o hook commercial_contract). Para canal NÃO há hook — então o
    // 400 do tiktok indica que set() realmente não persistiu. Tentativa
    // final: set com Array explícito via JSON round-trip + save + verificação.
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
      console.log('T301-0117 canal ANTES: ' + JSON.stringify(canal.values || []))
      if (!(canal.values || []).includes('tiktok')) {
        canal.set('values', JSON.parse(JSON.stringify(LISTA)))
        app.save(negocios)
        const depois = JSON.stringify(
          app.findCollectionByNameOrId('negocios').fields.getByName('canal').values || [],
        )
        console.log('T301-0117 canal DEPOIS: ' + depois)
      }
    } catch (err) {
      console.log('T301-0117 ERRO: ' + String(err))
    }
  },
  (app) => {},
)
