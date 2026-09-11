migrate(
  (app) => {
    // Onda 1 — higiene de dados: remove a fixture de teste "T239 PROVA perda
    // sem motivo (fixture arquivada)" (visível na lista de Oportunidades e no
    // dashboard) e corrige o motivo de devolução do handoff real, que exibia
    // texto interno de engenharia. Idempotente: try/catch em cada bloco.
    try {
      const fixtures = app.findRecordsByFilter('negocios', "titulo ~ 'T239 PROVA'", '', 20, 0)
      for (let i = 0; i < fixtures.length; i++) {
        const nid = fixtures[i].id
        try {
          const perms = app.findRecordsByFilter(
            'permanencias_negocio',
            'negocio = {:n}',
            '',
            50,
            0,
            { n: nid },
          )
          for (let j = 0; j < perms.length; j++) app.delete(perms[j])
        } catch (_) {}
        try {
          const props = app.findRecordsByFilter('propostas', 'negocio = {:n}', '', 50, 0, {
            n: nid,
          })
          for (let j = 0; j < props.length; j++) app.delete(props[j])
        } catch (_) {}
        try {
          const tars = app.findRecordsByFilter('tarefas', 'negocio = {:n}', '', 50, 0, {
            n: nid,
          })
          for (let j = 0; j < tars.length; j++) app.delete(tars[j])
        } catch (_) {}
        try {
          const hands = app.findRecordsByFilter('handoffs', 'negocio = {:n}', '', 50, 0, {
            n: nid,
          })
          for (let j = 0; j < hands.length; j++) app.delete(hands[j])
        } catch (_) {}
        app.delete(fixtures[i])
      }
    } catch (err) {
      console.log('Onda1 limpeza fixture T239: ' + String(err))
    }
    try {
      const hands = app.findRecordsByFilter(
        'handoffs',
        "motivo_devolucao ~ 'T2.34' || motivo_devolucao ~ 'teste humano'",
        '',
        20,
        0,
      )
      for (let i = 0; i < hands.length; i++) {
        hands[i].set('motivo_devolucao', 'Aguardando ajustes do time comercial')
        $app.save(hands[i])
      }
    } catch (err) {
      console.log('Onda1 correcao motivo handoff: ' + String(err))
    }
    try {
      const romeu = app.findRecordsByFilter('clientes', 'nome = "ROMEU"', '', 5, 0)
      for (let i = 0; i < romeu.length; i++) {
        romeu[i].set('nome', 'Romeu')
        $app.save(romeu[i])
      }
    } catch (err) {
      console.log('Onda1 correcao contato ROMEU: ' + String(err))
    }
  },
  (app) => {},
)
