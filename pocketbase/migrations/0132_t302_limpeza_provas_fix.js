// T3.02 — limpeza das fixtures de prova (correção da 0131: filtro vazio lança
// exceção no JSVM e o catch engolia — usar 'id != ""').
migrate(
  (app) => {
    var resto = []
    try {
      resto = $app.findRecordsByFilter('formularios', 'id != ""', '-created', 100, 0)
    } catch (err) {
      console.log('T302-0132 consulta falhou: ' + String(err))
      resto = []
    }
    for (var i = 0; i < resto.length; i++) {
      try {
        $app.delete(resto[i])
      } catch (err) {
        console.log('T302-0132 falha ao deletar ' + resto[i].id + ': ' + String(err))
      }
    }
  },
  (app) => {},
)
