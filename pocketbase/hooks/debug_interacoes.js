// DEBUG T2.10 — rota temporária SOMENTE LEITURA: inspeciona os campos da coleção
// interacoes e lista as interações do registro que bloqueia o delete.
// Sem efeitos colaterais. REMOVER antes de concluir a task.
routerAdd(
  'GET',
  '/backend/v1/debug/interacoes-schema',
  (e) => {
    try {
      const actor = e.auth
      if (!actor || actor.get('role') !== 'admin') {
        return e.json(403, { error: 'admin only' })
      }
      const col = $app.findCollectionByNameOrId('interacoes')
      const campos = []
      for (let i = 0; i < col.fields.length; i++) {
        const f = col.fields[i]
        campos.push({ nome: f.name, tipo: f.type, required: f.required })
      }
      // A interação que bloqueia:
      let bloqueadora = null
      try {
        bloqueadora = $app.findRecordById('interacoes', 'vraz2xood5xf7sc')
      } catch (_) {
        bloqueadora = null
      }
      return e.json(200, {
        campos: campos,
        bloqueadora: bloqueadora
          ? { id: bloqueadora.id, dados: bloqueadora.publicExport() }
          : 'não encontrada',
      })
    } catch (err) {
      return e.json(500, { erro: String(err) })
    }
  },
  $apis.requireAuth(),
)
