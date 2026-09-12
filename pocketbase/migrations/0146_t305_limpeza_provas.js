// T3.05 — limpeza das fixtures de prova (RED/GREEN por API) e restauração da
// próxima ação original da Felicidade (sobrescrita no GREEN 2).
// Lição T3.02: delete em migration usa app.delete(rec) — não $app.delete.
migrate(
  (app) => {
    var alvos = ['Prova T3.05 — proposta revisada', 'Prova T3.05 — cliente respondeu']
    var regs = app.findRecordsByFilter('interacoes_email', 'id != ""', '-created', 200, 0)
    for (var i = 0; i < regs.length; i++) {
      var assunto = String(regs[i].get('assunto') || '')
      for (var j = 0; j < alvos.length; j++) {
        if (assunto === alvos[j]) {
          app.delete(regs[i])
          break
        }
      }
    }
    // restaura próxima ação original da Felicidade (prova GREEN 2 sobrescreveu)
    try {
      var negocio = app.findRecordById('negocios', '4warv94hav36065')
      negocio.set('proxima_acao_descricao', 'Reunião de onboarding com a Felicidade')
      negocio.set('proxima_acao_em', '2026-09-15 09:00:00.000Z')
      app.save(negocio)
    } catch (err) {
      console.log('T305 limpeza: negocio Felicidade nao encontrado', String(err))
    }
  },
  (app) => {},
)
