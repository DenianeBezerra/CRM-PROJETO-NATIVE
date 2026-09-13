// T3.21 Leva B — limpeza das provas do endpoint de lote (2 peças + 2 campanhas D17).
migrate(
  (app) => {
    var ids = ['gwq0axqatzthytz', 'ur5avn61j1bv5cr']
    for (var i = 0; i < ids.length; i++) {
      try {
        var r = app.findRecordById('conteudos', ids[i])
        r.set('status', 'arquivado')
        r.set('titulo_interno', '[PROVA LevaB removida] ' + String(r.get('titulo_interno') || ''))
        app.save(r)
      } catch (_) {}
    }
    var slugs = ['2026-cfo-prova-lote', '2026-cfo-prova-lote-dois']
    for (var j = 0; j < slugs.length; j++) {
      try {
        var recs = app.findRecordsByFilter('campanhas', 'identificador = {:s}', '', 1, 0, {
          s: slugs[j],
        })
        if (recs.length) {
          var c = recs[0]
          c.set('status', 'encerrada')
          c.set('nome', '[PROVA removida] ' + String(c.get('nome') || ''))
          app.save(c)
        }
      } catch (_) {}
    }
  },
  (app) => {},
)
