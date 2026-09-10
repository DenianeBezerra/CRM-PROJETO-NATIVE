migrate(
  (app) => {
    // T2.01 / CA-2-036 — amplia o select 'acao' da auditoria para registrar delete.
    const audit = app.findCollectionByNameOrId('auditoria')
    const actionField = audit.fields.getByName('acao')
    if (actionField) {
      const values = actionField.values || []
      if (!values.includes('delete')) {
        actionField.values = [...values, 'delete']
        app.save(audit)
      }
    }
  },
  (app) => {
    // Rollback: remove 'delete' dos valores permitidos (eventos já gravados são
    // preservados — auditoria é append-only e nunca é apagada).
    const audit = app.findCollectionByNameOrId('auditoria')
    const actionField = audit.fields.getByName('acao')
    if (actionField) {
      actionField.values = (actionField.values || []).filter((v) => v !== 'delete')
      app.save(audit)
    }
  },
)
