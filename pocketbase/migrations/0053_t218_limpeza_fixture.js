migrate(
  (app) => {
    // T2.18 — limpeza da fixture de prova "T218 Fixture" (vzqxo8zuywhh2a0):
    // exceção (append-only via API, delete aqui), diagnóstico, permanências e
    // o próprio negócio (em fechado_perdido).
    const alvo = app.findRecordsByFilter('negocios', 'titulo = "T218 Fixture"', '', 5, 0)
    for (let i = 0; i < alvo.length; i++) {
      const nid = alvo[i].id
      const perms = app.findRecordsByFilter(
        'permanencias_negocio',
        'negocio = "' + nid + '"',
        '',
        50,
        0,
      )
      for (let j = 0; j < perms.length; j++) app.delete(perms[j])
      const diags = app.findRecordsByFilter('diagnosticos', 'negocio = "' + nid + '"', '', 50, 0)
      for (let j = 0; j < diags.length; j++) app.delete(diags[j])
      const excecoes = app.findRecordsByFilter(
        'excecoes_qualificacao',
        'negocio = "' + nid + '"',
        '',
        50,
        0,
      )
      for (let j = 0; j < excecoes.length; j++) app.delete(excecoes[j])
      app.delete(alvo[i])
    }
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
