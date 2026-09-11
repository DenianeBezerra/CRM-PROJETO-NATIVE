migrate(
  (app) => {
    // T2.40 — CA-2-035: exportação agregada do dashboard comercial registra a
    // trilha na MESMA coleção append-only `exportacoes` (T2.04). O campo
    // `entidade` é select com valores fixos — aqui o valor 'dashboard_comercial'
    // é ADICIONADO (sem remover os existentes). Idempotente.
    const col = app.findCollectionByNameOrId('exportacoes')
    const campo = col.fields.getByName('entidade')
    if (!campo.values.includes('dashboard_comercial')) {
      campo.values.push('dashboard_comercial')
      col.save()
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('exportacoes')
    const campo = col.fields.getByName('entidade')
    const idx = campo.values.indexOf('dashboard_comercial')
    if (idx >= 0) {
      campo.values.splice(idx, 1)
      col.save()
    }
  },
)
