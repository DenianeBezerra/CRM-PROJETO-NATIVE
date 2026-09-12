migrate(
  (app) => {
    // T3.01 — fix da 0112: garantir 'tesouraria' no select `servico` de negocios.
    // A 0112 aplicou sem efeito observável (PATCH servico=tesouraria continuou
    // 400) — hipótese: atribuição direta `field.values = arr` não persiste no
    // JSVM. Aqui: log do estado antes, set('values') explícito, save, e prova
    // pós-save lendo o campo de volta. Idempotente.
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const servico = negocios.fields.getByName('servico')
      const antes = JSON.stringify(servico.values || [])
      console.log('T301-0113 servico ANTES: ' + antes)
      if (!(servico.values || []).includes('tesouraria')) {
        const atual = (servico.values || []).slice()
        const idx = atual.indexOf('outro')
        if (idx >= 0) atual.splice(idx, 0, 'tesouraria')
        else atual.push('tesouraria')
        servico.set('values', atual)
        app.save(negocios)
        const depois = JSON.stringify(
          app.findCollectionByNameOrId('negocios').fields.getByName('servico').values || [],
        )
        console.log('T301-0113 servico DEPOIS: ' + depois)
      } else {
        console.log('T301-0113 servico ja contem tesouraria')
      }
    } catch (err) {
      console.log('T301-0113 ERRO: ' + String(err))
    }
  },
  (app) => {
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const servico = negocios.fields.getByName('servico')
      const atual = (servico.values || []).filter((v) => v !== 'tesouraria')
      servico.set('values', atual)
      app.save(negocios)
    } catch (_) {}
  },
)
