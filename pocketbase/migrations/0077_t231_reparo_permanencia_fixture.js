migrate(
  (app) => {
    // T2.31 — reparo da fixture de prova: a 1ª tentativa de ganho (antes do
    // try/catch defensivo) deixou permanência fantasma 'fechado_ganho' aberta
    // com o negócio ainda em 'novo'. Fecha a fantasma e reabre a 'novo'.
    const fix = app.findRecordsByFilter('negocios', 'titulo = "Fixture T231 ganho"', '', 1, 0)
    if (fix.length === 0) return
    const nid = fix[0].id

    const perms = app.findRecordsByFilter(
      'permanencias_negocio',
      'negocio = "' + nid + '"',
      '-created',
      20,
      0,
    )
    const agora = new Date().toISOString().replace('T', ' ')
    for (let i = 0; i < perms.length; i++) {
      const p = perms[i]
      const etapa = String(p.get('etapa') || '')
      const saiu = String(p.get('saiu_em') || '')
      const aberta = !saiu || saiu.startsWith('0001-01-01')
      if (etapa === 'fechado_ganho' && aberta) {
        // Fantasma: o negócio nunca chegou lá — remove.
        app.delete(p)
      } else if (etapa === 'novo' && aberta) {
        // Reabre a permanência do estágio atual.
        p.set('saiu_em', '')
        app.save(p)
      } else if (etapa === 'novo' && !aberta) {
        // A permanência 'novo' foi fechada indevidamente — reabre.
        p.set('saiu_em', '')
        app.save(p)
      }
    }
  },
  (app) => {
    // Down: irreversível por design (reparo de fixture).
  },
)
