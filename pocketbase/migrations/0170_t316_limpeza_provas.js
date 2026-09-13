// T3.16 — limpeza das fixtures de prova (empresa ZZ-TESTE-T316-IMPLANTACAO e dependentes).
// Remove: ficha de teste, etapas, implantação, empresa de teste, usuários comercial/coordenacao
// de teste e a config de teste. Ficha REAL da Felicidade NÃO é tocada.

migrate(
  (app) => {
    var empresaId = 'z0h3luhiwhb350w'
    var implId = '4d2xqwecfpfb1ru'
    var fichaId = '17gwofnl1fo6ul2'

    // etapas da implantação de teste
    var etapas = app.findRecordsByFilter('implantacao_etapas', 'implantacao = {:i}', '', 100, 0, {
      i: implId,
    })
    for (var i = 0; i < etapas.length; i++) app.delete(etapas[i])
    // implantação de teste
    var im = app.findRecordById('implantacoes', implId)
    app.delete(im)
    // ficha de teste
    var ficha = app.findRecordById('fichas_operacionais', fichaId)
    app.delete(ficha)
    // empresa de teste
    var emp = app.findRecordById('empresas', empresaId)
    app.delete(emp)
    // usuários de teste
    var emails = ['comercial-teste@vibratto.com.br', 'coordenacao-teste@vibratto.com.br']
    for (var u = 0; u < emails.length; u++) {
      var us = app.findRecordsByFilter('users', 'email = {:e}', '', 1, 0, { e: emails[u] })
      for (var k = 0; k < us.length; k++) app.delete(us[k])
    }
    // config de teste
    var cfgs = app.findRecordsByFilter(
      'configuracoes_operacionais',
      "chave = 'visao_ficha_desatualizada_dias'",
      '',
      1,
      0,
    )
    for (var c = 0; c < cfgs.length; c++) app.delete(cfgs[c])
  },
  (app) => {
    // down: nada (fixtures de prova não são restauradas)
  },
)
