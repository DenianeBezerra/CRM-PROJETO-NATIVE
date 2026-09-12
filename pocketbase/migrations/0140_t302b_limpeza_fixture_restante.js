// T3.02b — limpeza final (0140): remove a fixture de prova restante
// (tg2q2boplt5yj3o, criada antes da regra de motivo obrigatório).
migrate(
  (app) => {
    var ids = ['tg2q2boplt5yj3o']
    for (var i = 0; i < ids.length; i++) {
      try {
        var rec = app.findRecordById('fichas_proposta', ids[i])
        app.delete(rec)
        console.log('T302b-0140 deletado: ' + ids[i])
      } catch (err) {
        console.log('T302b-0140 falha ' + ids[i] + ': ' + String(err))
      }
    }
  },
  (app) => {},
)
