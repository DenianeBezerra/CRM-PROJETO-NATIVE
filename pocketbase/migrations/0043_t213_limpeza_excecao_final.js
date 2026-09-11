migrate(
  (app) => {
    // T2.13 — limpeza final: remove a exceção de prova (GREEN provado).
    // Delete direto via app em migration não passa pelas regras de API
    // (delete é bloqueado por design) — padrão das limpezas anteriores.
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
    // Down: não recria provas — irreversível por design (limpeza).
  },
)
