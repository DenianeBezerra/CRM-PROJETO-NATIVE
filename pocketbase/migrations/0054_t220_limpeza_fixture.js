migrate(
  (app) => {
    // T2.20 — limpeza da fixture de prova "T220 Fixture".
    const alvo = app.findRecordsByFilter('negocios', 'titulo = "T220 Fixture"', '', 5, 0)
    for (let i = 0; i < alvo.length; i++) {
      const nid = alvo[i].id
      const perms = app.findRecordsByFilter(
        'permanencias_negocio',
        'negocio = "' + nid + '"',
        '',
        50,
        0,
      )
      for (let j = 0; j < perms.length; j++) app.delete(perms[j])
      const diags = app.findRecordsByFilter('diagnosticos', 'negocio = "' + nid + '"', '', 50, 0)
      for (let j = 0; j < diags.length; j++) app.delete(diags[j])
      app.delete(alvo[i])
    }
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
