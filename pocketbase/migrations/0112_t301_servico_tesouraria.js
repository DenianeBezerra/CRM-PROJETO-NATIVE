migrate(
  (app) => {
    // T3.01 — correção pedida pela cliente (12/09): o select `servico` de
    // `negocios` deve refletir as frentes reais da Vibratto — BPO Financeiro,
    // Tesouraria, Controladoria e CFO as a Service (+ Outro). A migration
    // 0021 não tinha Tesouraria. Idempotente: só adiciona se não existir.
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const servico = negocios.fields.getByName('servico')
      const atual = (servico.values || []).slice()
      if (!atual.includes('tesouraria')) {
        // Inserir antes de 'outro' para manter a ordem legível da UI.
        const idx = atual.indexOf('outro')
        if (idx >= 0) {
          atual.splice(idx, 0, 'tesouraria')
        } else {
          atual.push('tesouraria')
        }
        servico.values = atual
        app.save(negocios)
        console.log('T301 servico tesouraria ADICIONADO: ' + JSON.stringify(atual))
      }
    } catch (err) {
      console.log('T301 servico tesouraria: ' + String(err))
    }
  },
  (app) => {
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const servico = negocios.fields.getByName('servico')
      const idx = (servico.values || []).indexOf('tesouraria')
      if (idx >= 0) {
        servico.values.splice(idx, 1)
        app.save(negocios)
      }
    } catch (_) {}
  },
)
