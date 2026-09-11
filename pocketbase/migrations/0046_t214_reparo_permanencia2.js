migrate(
  (app) => {
    // T2.14 — reparo 2: a prova GREEN criou permanência fantasma de
    // fechado_perdido (o request hook de próxima ação bloqueou DEPOIS que o
    // model hook de permanência já havia rodado? não — a ordem real: o throw
    // no request hook aborta antes; a fantasma veio do RED 4/GREEN que
    // passaram da validação de motivo mas falharam adiante). Estado alvo:
    // negócio em novo com UMA permanência aberta em novo.
    const negocioId = 'ek8vvnaisupsnga'
    const agora = new Date().toISOString().replace('T', ' ')

    // Fecha TODA permanência aberta que não seja de 'novo'.
    const abertas = app.findRecordsByFilter(
      'permanencias_negocio',
      'negocio = "' + negocioId + '" && (saiu_em = "" || saiu_em ~ "0001-01-01")',
      '',
      50,
      0,
    )
    for (let i = 0; i < abertas.length; i++) {
      if (String(abertas[i].get('etapa') || '') !== 'novo') {
        abertas[i].set('saiu_em', agora)
        app.save(abertas[i])
      }
    }

    // Garante exatamente UMA aberta em novo (a mais recente).
    const emNovo = app.findRecordsByFilter(
      'permanencias_negocio',
      'negocio = "' + negocioId + '" && etapa = "novo"',
      '-entrou_em',
      10,
      0,
    )
    for (let i = 0; i < emNovo.length; i++) {
      const deveAbrir = i === 0
      const jaAberta =
        String(emNovo[i].get('saiu_em') || '').trim() === '' ||
        String(emNovo[i].get('saiu_em') || '').startsWith('0001')
      if (deveAbrir && !jaAberta) {
        emNovo[i].set('saiu_em', '')
        app.save(emNovo[i])
      } else if (!deveAbrir && jaAberta) {
        emNovo[i].set('saiu_em', agora)
        app.save(emNovo[i])
      }
    }
  },
  (app) => {
    // Down: irreversível por design (reparo).
  },
)
