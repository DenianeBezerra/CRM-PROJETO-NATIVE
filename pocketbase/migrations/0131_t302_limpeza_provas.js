// T3.02 — limpeza das fixtures de prova (padrão 0111/0126): remove os
// formulários criados nas provas RED/GREEN por API e restaura a oportunidade
// "Proposta BPO" ao estado anterior à prova. JSVM: delete é $app.delete(rec).
migrate(
  (app) => {
    var resto = []
    try {
      resto = $app.findRecordsByFilter('formularios', '', '-created', 100, 0)
    } catch (_) {
      resto = []
    }
    for (var i = 0; i < resto.length; i++) {
      try {
        $app.delete(resto[i])
      } catch (err) {
        console.log('T302-0131 falha ao deletar ' + resto[i].id + ': ' + String(err))
      }
    }
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
