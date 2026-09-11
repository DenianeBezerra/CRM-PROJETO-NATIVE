migrate(
  (app) => {
    // T2.39 — limpeza complementar: o negócio órfão "T239 PROVA proposta sem
    // valor" (sem estágio) foi criado via API durante a prova GREEN, DEPOIS da
    // migration 0104 rodar — por isso o down da 0104 não o alcançou. Sua
    // proposta de contraste já foi removida pela 0105. Aqui removemos o negócio
    // e qualquer permanência restante. Idempotente.
    try {
      const orfaos = app.findRecordsByFilter(
        'negocios',
        "titulo = 'T239 PROVA proposta sem valor'",
        '',
        10,
        0,
      )
      for (let i = 0; i < orfaos.length; i++) {
        const nid = orfaos[i].id
        try {
          const perms = app.findRecordsByFilter(
            'permanencias_negocio',
            'negocio = {:n}',
            '',
            10,
            0,
            {
              n: nid,
            },
          )
          for (let j = 0; j < perms.length; j++) app.delete(perms[j])
        } catch (_) {}
        try {
          const ps = app.findRecordsByFilter('propostas', 'negocio = {:n}', '', 10, 0, {
            n: nid,
          })
          for (let j = 0; j < ps.length; j++) app.delete(ps[j])
        } catch (_) {}
        app.delete(orfaos[i])
      }
    } catch (err) {
      console.log('T239 limpeza orfao API: ' + String(err))
    }
  },
  (app) => {},
)
