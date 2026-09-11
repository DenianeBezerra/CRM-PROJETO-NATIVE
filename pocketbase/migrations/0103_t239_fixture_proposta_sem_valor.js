migrate(
  (app) => {
    // T2.39 — fixture de prova: proposta com valor AUSENTE (0) para provar o
    // aviso de cobertura. As regras da T2.21 bloqueiam create com valor <= 0
    // via API — a fixture nasce server-side (mesmo padrão das provas T2.35).
    const NID = 'dze8910cje2n1di'
    try {
      const col = app.findCollectionByNameOrId('propostas')
      const rec = new Record(col)
      rec.set('negocio', NID)
      rec.set('responsavel', 'v86kq5x0v4guoym')
      rec.set('versao', 1)
      rec.set('valor', 0)
      rec.set('resumo', 'Prova T2.39 proposta sem valor informado')
      rec.set('validade', '2026-10-20 00:00:00.000Z')
      rec.set('status', 'rascunho')
      rec.set('criado_por', 'v86kq5x0v4guoym')
      app.save(rec)
    } catch (err) {}
  },
  (app) => {
    try {
      const ps = app.findRecordsByFilter('propostas', 'negocio = {:n}', '', 10, 0, {
        n: 'dze8910cje2n1di',
      })
      for (let i = 0; i < ps.length; i++) app.delete(ps[i])
    } catch (_) {}
  },
)
