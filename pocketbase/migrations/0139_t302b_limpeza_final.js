// T3.02b — limpeza final (0139): remove qualquer ficha de prova restante.
migrate(
  (app) => {
    var resto = []
    try {
      resto = $app.findRecordsByFilter('fichas_proposta', 'id != ""', '-created', 100, 0)
    } catch (err) {
      console.log('T302b-0139 consulta falhou: ' + String(err))
      resto = []
    }
    console.log('T302b-0139 antes: ' + resto.length)
    for (var i = 0; i < resto.length; i++) {
      try {
        app.delete(resto[i])
        console.log('T302b-0139 deletado: ' + resto[i].id)
      } catch (err) {
        console.log('T302b-0139 ERRO ' + resto[i].id + ': ' + String(err))
      }
    }
  },
  (app) => {},
)
