// T3.22 — limpeza das provas: negócios/clientes/empresas/lotes de teste.
// Delete via API REST é bloqueado pelas regras (deleteRule null) — limpeza por migration (padrão provado).
migrate(
  (app) => {
    var removidos = { negocios: 0, clientes: 0, empresas: 0, lotes: 0, permanencias: 0 }
    // negócios de prova (título contém "Prova T322")
    var negs = app.findRecordsByFilter('negocios', "titulo ~ 'Prova T322'", '', 500, 0)
    for (var i = 0; i < negs.length; i++) {
      var perms = app.findRecordsByFilter(
        'permanencias_negocio',
        'negocio = "' + negs[i].id + '"',
        '',
        500,
        0,
      )
      for (var p = 0; p < perms.length; p++) {
        try {
          app.delete(perms[p])
          removidos.permanencias++
        } catch (_) {}
      }
      try {
        app.delete(negs[i])
        removidos.negocios++
      } catch (e) {
        console.log('0205 negocio falhou:', negs[i].id, String(e))
      }
    }
    // clientes de prova
    var clis = app.findRecordsByFilter('clientes', "email ~ 't322@exemplo.com'", '', 500, 0)
    for (var c = 0; c < clis.length; c++) {
      try {
        app.delete(clis[c])
        removidos.clientes++
      } catch (e) {
        console.log('0205 cliente falhou:', clis[c].id, String(e))
      }
    }
    // empresas de prova
    var emps = app.findRecordsByFilter('empresas', "nome ~ 'Prova T322'", '', 500, 0)
    for (var e2 = 0; e2 < emps.length; e2++) {
      try {
        app.delete(emps[e2])
        removidos.empresas++
      } catch (e3) {
        console.log('0205 empresa falhou:', emps[e2].id, String(e3))
      }
    }
    // lotes de prova
    var lotes = app.findRecordsByFilter(
      'importacoes_lotes',
      "arquivo_nome ~ 'prova_t322'",
      '',
      500,
      0,
    )
    for (var l = 0; l < lotes.length; l++) {
      try {
        app.delete(lotes[l])
        removidos.lotes++
      } catch (e4) {
        console.log('0205 lote falhou:', lotes[l].id, String(e4))
      }
    }
    console.log('0205 limpeza concluida:', JSON.stringify(removidos))
  },
  (app) => {},
)
