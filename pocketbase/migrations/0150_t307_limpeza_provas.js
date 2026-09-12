// T3.07 — limpeza das fixtures de prova (lead + contatos de rate limit +
// oportunidade/contato criados no vincular).
migrate(
  (app) => {
    var emails = [
      'prova.t307@vibratto.com.br',
      'rate1.t307@vibratto.com.br',
      'rate2.t307@vibratto.com.br',
      'rate3.t307@vibratto.com.br',
      'rate4.t307@vibratto.com.br',
    ]
    // 1) oportunidades criadas no vincular (título "Prova T307 Lead — entrada")
    try {
      var negs = app.findRecordsByFilter(
        'negocios',
        'titulo = "Prova T307 Lead — entrada"',
        '',
        10,
        0,
      )
      for (var i = 0; i < negs.length; i++) app.delete(negs[i])
    } catch (_) {}
    // 2) leads_entrada de prova
    try {
      for (var e = 0; e < emails.length; e++) {
        var leads = app.findRecordsByFilter('leads_entrada', 'email = {:em}', '', 10, 0, {
          em: emails[e],
        })
        for (var j = 0; j < leads.length; j++) app.delete(leads[j])
      }
    } catch (_) {}
    // 3) contatos de prova criados pelo vincular
    try {
      for (var k = 0; k < emails.length; k++) {
        var clis = app.findRecordsByFilter('clientes', 'email = {:em}', '', 5, 0, { em: emails[k] })
        for (var m = 0; m < clis.length; m++) app.delete(clis[m])
      }
    } catch (_) {}
  },
  (app) => {},
)
