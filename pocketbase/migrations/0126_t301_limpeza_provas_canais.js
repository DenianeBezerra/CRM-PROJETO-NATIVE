migrate(
  (app) => {
    // T3.01 — limpeza dos negócios de prova dos canais (T301-PROVA8/9).
    // Ordem: handoffs → tarefas → propostas → permanências → negócio.
    try {
      const provas = app.findRecordsByFilter('negocios', "titulo ~ 'T301-PROVA'", '', 10, 0)
      for (let i = 0; i < provas.length; i++) {
        const nid = provas[i].id
        try {
          const hands = app.findRecordsByFilter('handoffs', 'negocio = {:n}', '', 10, 0, { n: nid })
          for (let j = 0; j < hands.length; j++) app.delete(hands[j])
        } catch (_) {}
        try {
          const tars = app.findRecordsByFilter('tarefas', 'negocio = {:n}', '', 10, 0, { n: nid })
          for (let j = 0; j < tars.length; j++) app.delete(tars[j])
        } catch (_) {}
        try {
          const props = app.findRecordsByFilter('propostas', 'negocio = {:n}', '', 10, 0, {
            n: nid,
          })
          for (let j = 0; j < props.length; j++) app.delete(props[j])
        } catch (_) {}
        try {
          const perms = app.findRecordsByFilter(
            'permanencias_negocio',
            'negocio = {:n}',
            '',
            10,
            0,
            { n: nid },
          )
          for (let j = 0; j < perms.length; j++) app.delete(perms[j])
        } catch (_) {}
        app.delete(provas[i])
      }
      // Remover coleção de diagnóstico (não é produto).
      try {
        const diag = app.findCollectionByNameOrId('diagnostico_t301')
        app.delete(diag)
      } catch (_) {}
    } catch (err) {
      console.log('T301 limpeza provas canais: ' + String(err))
    }
  },
  (app) => {},
)
