migrate(
  (app) => {
    // T2.12 — limpeza final por ID direto (as migrations 0037/0038 anteriores
    // não alcançaram estes 2 registros órfãos). Idempotente: delete falha
    // silenciosamente se já removido.
    const orfas = ['rwb2sznw24rsgtj', '2gfnmz58y9nw4oa']
    for (const id of orfas) {
      try {
        app.delete(app.findRecordById('respostas_qualificacao', id))
      } catch (_) {}
    }
    // Verificação dupla: nenhuma resposta pode restar sem negócio existente.
    let restantes = []
    try {
      restantes = app.findRecordsByFilter('respostas_qualificacao', '', '-created', 100, 0)
    } catch (_) {}
    for (const r of restantes) {
      let negocioExiste = true
      try {
        app.findRecordById('negocios', r.get('negocio'))
      } catch (_) {
        negocioExiste = false
      }
      if (!negocioExiste) {
        try {
          app.delete(r)
        } catch (_) {}
      }
    }
  },
  (app) => {},
)
