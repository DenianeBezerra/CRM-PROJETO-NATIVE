// T3.02 — limpeza das fixtures de prova (0133: IDs explícitos via findRecordById).
migrate(
  (app) => {
    var ids = ['lo4w17ptk9ab90k', 'u4c7kgc7jhp68v7']
    for (var i = 0; i < ids.length; i++) {
      try {
        var rec = app.findRecordById('formularios', ids[i])
        $app.delete(rec)
        console.log('T302-0133 deletado: ' + ids[i])
      } catch (err) {
        console.log('T302-0133 falha ' + ids[i] + ': ' + String(err))
      }
    }
  },
  (app) => {},
)
