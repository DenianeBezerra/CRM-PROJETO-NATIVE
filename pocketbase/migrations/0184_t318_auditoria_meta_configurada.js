// T3.18 — SPEC-3-018: ampliar valores do select 'acao' da auditoria com
// meta_configurada (metas editáveis pela CEO — backlog Etapa 3 §2.3).
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
    if (valores.indexOf('meta_configurada') < 0) {
      valores.push('meta_configurada')
      campoAcao.values = valores
      app.save(col)
    }
  },
  (app) => {},
)
