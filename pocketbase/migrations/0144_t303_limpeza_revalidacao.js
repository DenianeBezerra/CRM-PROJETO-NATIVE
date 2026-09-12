// T3.03 — limpeza da interação de revalidação da conclusão (prova GREEN refeita).
migrate(
  (app) => {
    try {
      var regs = app.findRecordsByFilter(
        'interacoes_whatsapp',
        'resumo = "Revalidacao T3.03 conclusao — sera removida."',
        '-created',
        10,
        0,
      )
      for (var i = 0; i < regs.length; i++) {
        app.delete(regs[i])
      }
    } catch (err) {
      console.log('T303 reval limpeza falhou', String(err))
    }
  },
  (app) => {},
)
