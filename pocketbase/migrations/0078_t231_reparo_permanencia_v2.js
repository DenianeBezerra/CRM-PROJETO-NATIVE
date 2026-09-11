migrate(
  (app) => {
    // T2.31 — reparo da fixture de prova (v2: título mudou na prova de
    // concorrência da T2.29 — usar filtro ~). Fecha/remove a permanência
    // fantasma 'fechado_ganho' e reabre a 'novo'.
    const fix = app.findRecordsByFilter('negocios', 'titulo ~ "Fixture T231 ganho"', '', 1, 0)
    if (fix.length === 0) return
    const nid = fix[0].id

    const perms = app.findRecordsByFilter(
      'permanencias_negocio',
      'negocio = "' + nid + '"',
      '-created',
      20,
      0,
    )
    for (let i = 0; i < perms.length; i++) {
      const p = perms[i]
      const etapa = String(p.get('etapa') || '')
      const saiu = String(p.get('saiu_em') || '')
      const aberta = !saiu || saiu.startsWith('0001-01-01')
      if (etapa === 'fechado_ganho' && aberta) {
        app.delete(p)
      } else if (etapa === 'novo') {
        p.set('saiu_em', '')
        app.save(p)
      }
    }
  },
  (app) => {
    // Down: irreversível por design (reparo de fixture).
  },
)
