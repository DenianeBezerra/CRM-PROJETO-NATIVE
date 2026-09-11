migrate(
  (app) => {
    // T2.25 — fixture de prova: retroage a validade da v13 (emitida) para o
    // passado, simulando vencimento. A imutabilidade da emitida vale na API;
    // aqui é escrita direta de fixture (limpeza na 0061).
    const props = app.findRecordsByFilter('propostas', 'versao = 13', '', 5, 0)
    for (let i = 0; i < props.length; i++) {
      props[i].set('validade', '2026-09-10 12:00:00.000Z')
      app.save(props[i])
    }
  },
  (app) => {
    // Down: irreversível por design (fixture).
  },
)
