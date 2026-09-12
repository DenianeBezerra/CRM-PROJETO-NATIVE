// T3.02 — limpeza das fixtures de prova (padrão 0111/0126): remove os 2
// formulários criados nas provas RED/GREEN por API e restaura a oportunidade
// "Proposta BPO" ao estado anterior à prova (campos de contexto vazios).
migrate(
  (app) => {
    var ids = ['lo4w17ptk9ab90k']
    for (var i = 0; i < ids.length; i++) {
      try {
        app.deleteRecord('formularios', ids[i])
      } catch (_) {}
    }
    // O segundo formulário (consultoria, marcado enviado) é identificado por status/status+solucao.
    try {
      var resto = $app.findRecordsByFilter(
        'formularios',
        'solucao = "consultoria"',
        '-created',
        100,
        0,
      )
      for (var j = 0; j < resto.length; j++) {
        try {
          app.deleteRecord('formularios', resto[j].id)
        } catch (_) {}
      }
    } catch (_) {}
    try {
      var negocio = app.findRecordById('negocios', 'ek8vvnaisupsnga')
      negocio.set('formulario_status', '')
      negocio.set('dados_formulario', '')
      negocio.set('formulario_resumo', '')
      app.save(negocio)
    } catch (_) {}
  },
  (app) => {},
)
