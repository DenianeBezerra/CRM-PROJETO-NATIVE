// T3.02b — limpeza da fixture de prova (0138): app.delete(rec) no app da
// migration (assinatura provada na 0135).
migrate(
  (app) => {
    try {
      var rec = app.findRecordById('fichas_proposta', 'ofxq3gjc72obvq3')
      app.delete(rec)
      console.log('T302b-0138 deletado: ofxq3gjc72obvq3')
    } catch (err) {
      console.log('T302b-0138 falha: ' + String(err))
    }
  },
  (app) => {},
)
