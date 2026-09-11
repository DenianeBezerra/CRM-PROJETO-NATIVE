migrate(
  (app) => {
    // T2.27 — limpeza complementar: remove a fixture usada nas provas RED
    // de conclusão (R6/R7), que ficou aberta e não foi coberta pela 0067.
    const tarefas = app.findRecordsByFilter(
      'tarefas',
      'titulo = "Tarefa de prova conclusao"',
      '',
      10,
      0,
    )
    for (let i = 0; i < tarefas.length; i++) app.delete(tarefas[i])
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
