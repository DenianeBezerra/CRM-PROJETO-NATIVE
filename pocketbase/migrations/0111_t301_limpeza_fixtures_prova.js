migrate(
  (app) => {
    // T3.01 — limpeza das fixtures de prova criadas nas provas GREEN por API
    // (teste humano pendente): 2 negócios "T301-*-fixture" + cliente
    // "T301-RED-fixture-cli" + 2 handoffs órfãos. Idempotente: try/catch em
    // cada bloco. A oportunidade real da Felicidade Collective NÃO é afetada.
    try {
      const fixtures = app.findRecordsByFilter('negocios', "titulo ~ 'T301'", '', 20, 0)
      for (let i = 0; i < fixtures.length; i++) {
        const nid = fixtures[i].id
        try {
          const hands = app.findRecordsByFilter('handoffs', 'negocio = {:n}', '', 50, 0, {
            n: nid,
          })
          for (let j = 0; j < hands.length; j++) app.delete(hands[j])
        } catch (_) {}
        try {
          const props = app.findRecordsByFilter('propostas', 'negocio = {:n}', '', 50, 0, {
            n: nid,
          })
          for (let j = 0; j < props.length; j++) app.delete(props[j])
        } catch (_) {}
        try {
          const tars = app.findRecordsByFilter('tarefas', 'negocio = {:n}', '', 50, 0, {
            n: nid,
          })
          for (let j = 0; j < tars.length; j++) app.delete(tars[j])
        } catch (_) {}
        try {
          const perms = app.findRecordsByFilter(
            'permanencias_negocio',
            'negocio = {:n}',
            '',
            50,
            0,
            { n: nid },
          )
          for (let j = 0; j < perms.length; j++) app.delete(perms[j])
        } catch (_) {}
        app.delete(fixtures[i])
      }
    } catch (err) {
      console.log('T301 limpeza negocios fixture: ' + String(err))
    }
    try {
      const cli = app.findRecordsByFilter('clientes', "nome ~ 'T301'", '', 10, 0)
      for (let i = 0; i < cli.length; i++) app.delete(cli[i])
    } catch (err) {
      console.log('T301 limpeza cliente fixture: ' + String(err))
    }
    try {
      // Handoffs órfãos das provas (varredura independente para idempotência).
      const orfaos = app.findRecordsByFilter('handoffs', "titulo ~ 'T301'", '', 20, 0)
      for (let i = 0; i < orfaos.length; i++) app.delete(orfaos[i])
    } catch (err) {
      console.log('T301 limpeza handoffs orfaos: ' + String(err))
    }
  },
  (app) => {},
)
