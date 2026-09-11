migrate(
  (app) => {
    // T2.17 — limpeza da fixture de prova: diagnóstico (append-only via API,
    // removido aqui por migration), permanências e o negócio "T217 Fixture".
    const fid = app.findRecordsByFilter('negocios', 'titulo = "T217 Fixture"', '', 5, 0)
    for (let i = 0; i < fid.length; i++) {
      const nid = fid[i].id
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
      app.delete(fid[i])
    }
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
