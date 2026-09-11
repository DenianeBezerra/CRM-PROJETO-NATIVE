migrate(
  (app) => {
    // T2.13 — limpeza pós-revalidação: remove a exceção criada na
    // revalidação independente (delete direto via app, sem regras de API).
    const negocioId = 'ek8vvnaisupsnga'
    const excecoes = app.findRecordsByFilter(
      'excecoes_qualificacao',
      'negocio = "' + negocioId + '"',
      '',
      50,
      0,
    )
    for (let i = 0; i < excecoes.length; i++) {
      app.delete(excecoes[i])
    }
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
