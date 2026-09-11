migrate(
  (app) => {
    // T2.28 — limpeza das fixtures de prova (lição das levas anteriores).
    // Exceções são append-only (updateRule/deleteRule null) e o negócio fixture
    // tem permanência — remoção no nível de modelo, sem request hooks.
    const titulosTarefa = ['Fixture sem prazo T228', 'Fixture tarefa vencida T228']
    for (let i = 0; i < titulosTarefa.length; i++) {
      const ts = app.findRecordsByFilter(
        'tarefas',
        'titulo = "' + titulosTarefa[i] + '"',
        '',
        10,
        0,
      )
      for (let j = 0; j < ts.length; j++) app.delete(ts[j])
    }

    const negocios = app.findRecordsByFilter('negocios', 'titulo ~ "Fixture T228"', '', 10, 0)
    for (let i = 0; i < negocios.length; i++) app.delete(negocios[i])

    // Exceções órfãs (negócio removido) e as da prova.
    const excecoes = app.findRecordsByFilter('excecoes_qualificacao', '', '', 100, 0)
    for (let i = 0; i < excecoes.length; i++) {
      const x = excecoes[i]
      const motivo = String(x.get('motivo') || '')
      let negocioExiste = false
      try {
        app.findRecordById('negocios', String(x.get('negocio') || ''))
        negocioExiste = true
      } catch (_) {
        negocioExiste = false
      }
      // Remove exceções de fixtures e qualquer órfã; mantém apenas exceções
      // reais de negócios existentes que não sejam desta prova.
      if (motivo.indexOf('T228') >= 0 || !negocioExiste) {
        app.delete(x)
      }
    }
  },
  (app) => {
    // Down: irreversível por design (limpeza).
  },
)
