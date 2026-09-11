migrate(
  (app) => {
    // T2.39 — limpeza de estado pós-teste humano aprovado:
    // 1) remove a proposta de contraste da prova GREEN (guj5vqimceljbvy,
    //    rascunho valor 5000 no negócio fixture sem estágio) — delete via API
    //    é bloqueado por design (T2.21 append-only), logo migration de estado;
    // 2) remove o negócio fixture da 0104 ("T239 PROVA proposta sem valor
    //    (fixture)") com sua proposta e permanência.
    // Idempotente: try/catch em cada bloco, nada falha se já limpo.
    // 1) Proposta de contraste (rascunho, resumo da prova GREEN)
    try {
      const props = app.findRecordsByFilter(
        'propostas',
        "resumo = 'Prova T2.39 proposta sem valor informado'",
        '',
        10,
        0,
      )
      for (let i = 0; i < props.length; i++) app.delete(props[i])
    } catch (err) {
      console.log('T239 limpeza proposta fixture: ' + String(err))
    }
    // Proposta de contraste por valor (rascunho 5000 criado na prova GREEN)
    try {
      const contrastes = app.findRecordsByFilter(
        'propostas',
        "resumo ~ 'contraste' || resumo ~ 'T239' || resumo ~ 'T2.39'",
        '',
        20,
        0,
      )
      for (let i = 0; i < contrastes.length; i++) app.delete(contrastes[i])
    } catch (_) {}
    // 2) Negócio fixture da 0104 + proposta + permanência
    try {
      const ns = app.findRecordsByFilter(
        'negocios',
        "titulo = 'T239 PROVA proposta sem valor (fixture)'",
        '',
        10,
        0,
      )
      for (let i = 0; i < ns.length; i++) {
        const nid = ns[i].id
        try {
          const ps = app.findRecordsByFilter('propostas', 'negocio = {:n}', '', 10, 0, {
            n: nid,
          })
          for (let j = 0; j < ps.length; j++) app.delete(ps[j])
        } catch (_) {}
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
        app.delete(ns[i])
      }
    } catch (err) {
      console.log('T239 limpeza negocio fixture: ' + String(err))
    }
  },
  (app) => {},
)
