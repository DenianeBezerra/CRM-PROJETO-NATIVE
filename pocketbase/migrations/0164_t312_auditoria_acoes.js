// T3.12 — ampliar valores do select 'acao' da auditoria para os eventos do motor.
// A coleção nasceu com apenas ['create','update']; o motor grava motor_executado,
// baixa, baixa_lote e bloqueio — e o delete já existia em rotina de 0020.
// Lição AP-0200: atribuição direta field.values = [...] (NÃO .set('values')).
migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('auditoria')
    var campoAcao = null
    for (var i = 0; i < col.fields.length; i++) {
      if (col.fields[i].name === 'acao') {
        campoAcao = col.fields[i]
        break
      }
    }
    var valores = campoAcao.values || []
    var novos = ['motor_executado', 'baixa', 'baixa_lote', 'bloqueio', 'delete']
    for (var j = 0; j < novos.length; j++) {
      if (valores.indexOf(novos[j]) < 0) valores.push(novos[j])
    }
    campoAcao.values = valores
    app.save(col)
  },
  (app) => {},
)
