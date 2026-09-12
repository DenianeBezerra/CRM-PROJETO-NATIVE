migrate(
  (app) => {
    // T3.01 — DIAGNÓSTICO DEFINITIVO do enum canal: a migration grava um
    // documento na coleção `diagnostico_t301` com o estado REAL do campo
    // canal lido do banco (values, type, id do field). Assim vemos o que o
    // runtime enxerga, sem depender de logs.
    try {
      const negocios = app.findCollectionByNameOrId('negocios')
      const canal = negocios.fields.getByName('canal')
      const estado = {
        values: canal.values || [],
        type: canal.type || '',
        maxSelect: canal.maxSelect,
      }
      console.log('T301-DIAG canal: ' + JSON.stringify(estado))
      // Persistir o diagnóstico em registro (visível via API):
      let col
      try {
        col = app.findCollectionByNameOrId('diagnostico_t301')
      } catch (_) {
        col = new Collection({
          name: 'diagnostico_t301',
          type: 'base',
          fields: [
            { name: 'titulo', type: 'text', max: 200 },
            { name: 'payload', type: 'text', max: 5000 },
          ],
        })
        app.save(col)
      }
      const rec = new Record(col)
      rec.set('titulo', 'canal-estado')
      rec.set('payload', JSON.stringify(estado))
      app.save(rec)
    } catch (err) {
      console.log('T301-DIAG ERRO: ' + String(err))
    }
  },
  (app) => {},
)
