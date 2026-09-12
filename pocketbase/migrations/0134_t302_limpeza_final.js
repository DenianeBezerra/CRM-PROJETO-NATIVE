// T3.02 — limpeza final das fixtures de prova (0134, com contagem logada).
migrate(
  (app) => {
    var antes = []
    try {
      antes = $app.findRecordsByFilter('formularios', 'id != ""', '-created', 100, 0)
    } catch (err) {
      console.log('T302-0134 consulta falhou: ' + String(err))
    }
    console.log('T302-0134 antes: ' + antes.length)
    for (var i = 0; i < antes.length; i++) {
      try {
        $app.delete(antes[i])
        console.log('T302-0134 deletado: ' + antes[i].id)
      } catch (err) {
        console.log('T302-0134 ERRO delete ' + antes[i].id + ': ' + String(err))
      }
    }
    var depois = []
    try {
      depois = $app.findRecordsByFilter('formularios', 'id != ""', '-created', 100, 0)
    } catch (_) {}
    console.log('T302-0134 depois: ' + depois.length)
  },
  (app) => {},
)
