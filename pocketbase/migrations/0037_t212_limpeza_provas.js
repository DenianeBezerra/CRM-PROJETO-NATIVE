migrate(
  (app) => {
    // T2.12 — limpeza dos dados de prova por API (idempotente).
    // Ordem: respostas antes do negócio (required reference).
    const respostas = ['rwb2sznw24', '2gfnmz58y9']
    for (const id of respostas) {
      try {
        const r = app.findRecordById('respostas_qualificacao', id)
        if (String(r.get('negocio')).indexOf('0qo39n07czebsep') === 0 || true) {
          // só remove se pertencer ao negócio-fixture da prova
          if (String(r.get('negocio')) === '0qo39n07czebsep') app.delete(r)
        }
      } catch (_) {}
    }
    try {
      app.delete(app.findRecordById('negocios', '0qo39n07czebsep'))
    } catch (_) {}
    // Restaurar perguntas ao estado anterior às provas (inativas).
    for (const pid of ['lxdzc9n2xlv41l6', 'thcpjic7vtzyio0']) {
      try {
        const p = app.findRecordById('perguntas_qualificacao', pid)
        if (p.get('ativa')) {
          p.set('ativa', false)
          app.save(p)
        }
      } catch (_) {}
    }
  },
  (app) => {
    // Rollback: sem ação (dados de prova não devem voltar).
  },
)
