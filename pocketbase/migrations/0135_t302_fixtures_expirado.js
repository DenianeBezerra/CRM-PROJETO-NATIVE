// T3.02 — fixtures de prova marcadas como expirado (delete via migration não
// funciona neste runtime — pendência de debug registrada; update funciona).
migrate(
  (app) => {
    var ids = ['lo4w17ptk9ab90k', 'u4c7kgc7jhp68v7']
    for (var i = 0; i < ids.length; i++) {
      try {
        var rec = app.findRecordById('formularios', ids[i])
        rec.set('status', 'expirado')
        rec.set(
          'resumo',
          '[FIXTURE DE PROVA T3.02 — remover em debug] ' +
            String(rec.get('resumo') || '').slice(0, 100),
        )
        app.save(rec)
      } catch (_) {}
    }
  },
  (app) => {},
)
