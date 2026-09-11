migrate(
  (app) => {
    // T2.15 — limpeza das provas: pergunta de prova (e respostas), exceções
    // de prova e resíduo no negócio real.
    const negocioId = 'ek8vvnaisupsnga'

    // 1) Respostas da pergunta de prova + a própria pergunta (delete direto).
    const pid = 'lr0n7vfsucag6vj'
    const respostas = app.findRecordsByFilter(
      'respostas_qualificacao',
      'pergunta = "' + pid + '"',
      '',
      50,
      0,
    )
    for (let i = 0; i < respostas.length; i++) app.delete(respostas[i])
    try {
      app.delete(app.findRecordById('perguntas_qualificacao', pid))
    } catch (_) {}

    // 2) Exceções de prova do negócio real.
    const excecoes = app.findRecordsByFilter(
      'excecoes_qualificacao',
      'negocio = "' + negocioId + '"',
      '',
      50,
      0,
    )
    for (let i = 0; i < excecoes.length; i++) app.delete(excecoes[i])
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
