migrate(
  (app) => {
    // T2.27 — limpeza da fixture de prova (lição das levas anteriores:
    // fixtures acumulam ruído na UI — limpar ao fim de cada leva).
    // A tarefa de prova fica concluída (imutável por request hook), então a
    // remoção é feita no nível de modelo, que não passa pelos request hooks.
    const tarefas = app.findRecordsByFilter(
      'tarefas',
      'titulo = "Preparar proposta revisada"',
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
