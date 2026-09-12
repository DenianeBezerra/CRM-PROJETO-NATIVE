// T3.07 — limpeza final das fixtures de prova (segunda rodada: rateb*, prova
// reenviada, e qualquer lead de teste restante com e-mail *.t307@).
migrate(
  (app) => {
    var padrao = 't307@vibratto.com.br'
    var colecoes = ['leads_entrada', 'clientes']
    for (var c = 0; c < colecoes.length; c++) {
      try {
        var regs = app.findRecordsByFilter(colecoes[c], 'email ~ {:p}', '', 200, 0, { p: padrao })
        for (var i = 0; i < regs.length; i++) app.delete(regs[i])
      } catch (_) {}
    }
    try {
      var negs = app.findRecordsByFilter(
        'negocios',
        'titulo = "Prova T307 Lead — entrada"',
        '',
        10,
        0,
      )
      for (var j = 0; j < negs.length; j++) app.delete(negs[j])
    } catch (_) {}
  },
  (app) => {},
)
