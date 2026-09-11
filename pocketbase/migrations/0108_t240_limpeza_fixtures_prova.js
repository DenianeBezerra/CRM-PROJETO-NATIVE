migrate(
  (app) => {
    // T2.40 — limpeza das fixtures de prova (teste humano pendente, mas a
    // base de provas por API deve ficar limpa agora):
    // 1) negócio de prova "=SOMA(1+1) T240 PROVA" (criado via API para provar
    //    a neutralização CSV);
    // 2) aceite de exportação de contraste (pokl4oahxpppnli) e os aceites
    //    criados nas provas (usuário admin, provas T2.40).
    // Idempotente: try/catch em cada bloco.
    try {
      const provas = app.findRecordsByFilter(
        'negocios',
        "titulo = '=SOMA(1+1) T240 PROVA'",
        '',
        10,
        0,
      )
      for (let i = 0; i < provas.length; i++) {
        const nid = provas[i].id
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
        try {
          const props = app.findRecordsByFilter('propostas', 'negocio = {:n}', '', 10, 0, {
            n: nid,
          })
          for (let j = 0; j < props.length; j++) app.delete(props[j])
        } catch (_) {}
        app.delete(provas[i])
      }
    } catch (err) {
      console.log('T240 limpeza negocio prova: ' + String(err))
    }
    try {
      // Aceites de contraste das provas (não têm efeito comercial; a trilha
      // exportacoes é append-only e permanece como histórico).
      const aceites = app.findRecordsByFilter(
        'aceites_exportacao',
        "usuario = 'v86kq5x0v4guoym' && entidade = 'negocios' && filtros = '{}'",
        '-created',
        5,
        0,
      )
      for (let i = 0; i < aceites.length; i++) app.delete(aceites[i])
    } catch (err) {
      console.log('T240 limpeza aceites prova: ' + String(err))
    }
  },
  (app) => {},
)
