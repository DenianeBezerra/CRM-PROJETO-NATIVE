migrate(
  (app) => {
    // T2.25 — fixture do teste humano: retroage a validade da v14 (emitida)
    // para o passado (vencida em 10/09/2026).
    const props = app.findRecordsByFilter('propostas', 'versao = 14', '', 5, 0)
    for (let i = 0; i < props.length; i++) {
      props[i].set('validade', '2026-09-10 12:00:00.000Z')
      app.save(props[i])
    }
  },
  (app) => {
    // Down: irreversível por design (fixture).
  },
)
