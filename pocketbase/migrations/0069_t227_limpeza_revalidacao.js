migrate(
  (app) => {
    // T2.27 — limpeza da fixture de revalidação (mesma lição: toda fixture
    // de prova sai da base ao fim da task).
    const tarefas = app.findRecordsByFilter(
      'tarefas',
      'titulo = "Revalidacao independente"',
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
