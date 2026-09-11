migrate(
  (app) => {
    // T2.35 — fixture de prova GREEN-3: handoff ACEITO com pendências (1 aberta,
    // 1 resolvida) para provar tempo_ate_aceite e pendencias_abertas.
    // Negócio de prova criado por API (9j68rhow7e30gb6).
    const NID = '9j68rhow7e30gb6'
    try {
      const col = app.findCollectionByNameOrId('handoffs')
      const rec = new Record(col)
      rec.set('negocio', NID)
      rec.set('origem', 'bpo_financeiro')
      rec.set('responsavel_emissor', 'v86kq5x0v4guoym')
      rec.set('responsavel_receptor', 'v86kq5x0v4guoym')
      rec.set('status', 'aceito')
      rec.set('checklist', JSON.stringify([{ item: 'Contrato', obrigatorio: true, feito: true }]))
      rec.set('criado_em', '2026-09-10 10:00:00.000Z')
      rec.set('aceito_em', '2026-09-11 10:30:00.000Z')
      rec.set(
        'pendencias',
        JSON.stringify({
          itens: [
            { item: 'Kickoff agendar', dono: 'Karine', prazo: '2026-09-20', resolvida_em: '' },
            {
              item: 'Docs enviados',
              dono: 'Leandro',
              prazo: '2026-09-15',
              resolvida_em: '2026-09-12',
            },
          ],
        }),
      )
      app.save(rec)
    } catch (err) {}
  },
  (app) => {
    // rollback: remove a fixture
    try {
      const hs = app.findRecordsByFilter('handoffs', 'negocio = {:n}', '', 10, 0, {
        n: '9j68rhow7e30gb6',
      })
      for (let i = 0; i < hs.length; i++) app.delete(hs[i])
      app.delete(app.findRecordById('negocios', '9j68rhow7e30gb6'))
    } catch (_) {}
  },
)
