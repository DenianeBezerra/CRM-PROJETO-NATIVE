migrate(
  (app) => {
    // T2.23 — limpeza das provas: rascunhos e emissões de teste (v7, v8 e
    // resíduos) do negócio real. Delete direto via app (API bloqueia).
    const nid = 'ek8vvnaisupsnga'
    const alvos = [7, 8]
    for (let i = 0; i < alvos.length; i++) {
      const props = app.findRecordsByFilter(
        'propostas',
        'negocio = "' + nid + '" && versao = ' + alvos[i],
        '',
        5,
        0,
      )
      for (let j = 0; j < props.length; j++) app.delete(props[j])
    }
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
