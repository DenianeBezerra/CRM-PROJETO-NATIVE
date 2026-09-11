migrate(
  (app) => {
    // T2.14 — limpeza: remove a fixture de prova e repara o histórico do
    // negócio real "Proposta BPO" (permanências duplicadas pelos testes).
    const negocioId = 'ek8vvnaisupsnga'

    // 1) Fixture T214: remove permanências e o registro.
    const fid = 'z645dsxwqb6qccd'
    const perms = app.findRecordsByFilter(
      'permanencias_negocio',
      'negocio = "' + fid + '"',
      '',
      50,
      0,
    )
    for (let i = 0; i < perms.length; i++) app.delete(perms[i])
    try {
      app.delete(app.findRecordById('negocios', fid))
    } catch (_) {}

    // 2) Negócio real: deixa exatamente UMA permanência aberta, em 'novo'.
    const agora = new Date().toISOString().replace('T', ' ')
    const abertas = app.findRecordsByFilter(
      'permanencias_negocio',
      'negocio = "' + negocioId + '" && (saiu_em = "" || saiu_em ~ "0001-01-01")',
      '',
      50,
      0,
    )
    let abertasNovo = 0
    for (let i = 0; i < abertas.length; i++) {
      if (String(abertas[i].get('etapa') || '') === 'novo' && abertasNovo === 0) {
        abertasNovo++
        continue
      }
      abertas[i].set('saiu_em', agora)
      app.save(abertas[i])
    }
    if (abertasNovo === 0) {
      const emNovo = app.findRecordsByFilter(
        'permanencias_negocio',
        'negocio = "' + negocioId + '" && etapa = "novo"',
        '-entrou_em',
        1,
        0,
      )
      if (emNovo.length > 0) {
        emNovo[0].set('saiu_em', '')
        app.save(emNovo[0])
      }
    }
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
