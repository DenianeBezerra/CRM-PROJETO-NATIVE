migrate(
  (app) => {
    // T3.01 — limpeza do negócio de prova "T301-PROVA-tiktok" (criado para
    // provar o canal novo; delete via API bloqueado por relation/handoff).
    // Ordem: handoffs → tarefas → propostas → permanências → negócio.
    // Idempotente.
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
    } catch (err) {
      console.log('T301 limpeza PROVA tiktok: ' + String(err))
    }
  },
  (app) => {},
)
