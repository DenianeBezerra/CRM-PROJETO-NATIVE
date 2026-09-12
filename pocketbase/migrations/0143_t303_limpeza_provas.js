// T3.03 — limpeza das fixtures de prova (RED/GREEN por API).
// Remove as 3 interações criadas durante as provas e restaura a próxima ação
// original da oportunidade Felicidade (sobrescrita no GREEN 2).
// Lição T3.02: delete em migration usa app.delete(rec) — não $app.delete.
migrate(
  (app) => {
    var alvos = [
      'Prova T3.03: contato de alinhamento sobre o onboarding da Felicidade.',
      'Prova T3.03: cliente pediu revisao do escopo pelo WhatsApp.',
      'teste rota get debug',
    ]
    var regs = app.findRecordsByFilter('interacoes_whatsapp', 'id != ""', '-created', 200, 0)
    for (var i = 0; i < regs.length; i++) {
      var resumo = String(regs[i].get('resumo') || '')
      for (var j = 0; j < alvos.length; j++) {
        if (resumo === alvos[j]) {
          app.delete(regs[i])
          break
        }
      }
    }
    // restaura próxima ação original da Felicidade (prova GREEN 2 sobrescreveu)
    try {
      var negocio = app.findRecordById('negocios', '4warv94hav36065')
      negocio.set('proxima_acao_descricao', 'Onboarding — alinhamento de escopo e início')
      negocio.set('proxima_acao_em', '2026-09-15 00:00:00.000Z')
      app.save(negocio)
    } catch (err) {
      console.log('T303 limpeza: negocio Felicidade nao encontrado', String(err))
    }
  },
  (app) => {
    // down: nada a fazer (fixtures de prova não voltam)
  },
)
