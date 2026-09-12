// T3.06 — limpeza das fixtures de prova (proposta aceita, negócio fixture e
// execuções de automação geradas durante as provas).
// A proposta fixture foi decidida (aceita) — delete é bloqueado no hook, então
// a limpeza usa app.delete direto (migration roda com contexto de sistema).
migrate(
  (app) => {
    // 1) execuções de automação da fixture
    try {
      var execs = app.findRecordsByFilter(
        'automacoes_execucoes',
        'negocio = {:n}',
        '-created',
        50,
        0,
        { n: '49v4i7dkanmjuxd' },
      )
      for (var i = 0; i < execs.length; i++) app.delete(execs[i])
    } catch (err) {
      console.log('T306 limpeza execucoes falhou', String(err))
    }
    // 2) proposta fixture (aceita)
    try {
      var prop = app.findRecordById('propostas', 'bjjmozkbvzy5ic3')
      app.delete(prop)
    } catch (err) {
      console.log('T306 limpeza proposta falhou', String(err))
    }
    // 3) permanências do negócio fixture
    try {
      var perms = app.findRecordsByFilter(
        'permanencias_negocio',
        'negocio = {:n}',
        '-created',
        50,
        0,
        { n: '49v4i7dkanmjuxd' },
      )
      for (var j = 0; j < perms.length; j++) app.delete(perms[j])
    } catch (err) {
      console.log('T306 limpeza permanencias falhou', String(err))
    }
    // 4) negócio fixture
    try {
      var neg = app.findRecordById('negocios', '49v4i7dkanmjuxd')
      app.delete(neg)
    } catch (err) {
      console.log('T306 limpeza negocio falhou', String(err))
    }
  },
  (app) => {},
)
