// DEBUG T2.05 — rota temporária para provar a lógica de retenção sob demanda.
// Executa a MESMA lógica do cron audit_retention.js. REMOVER antes de concluir.
routerAdd(
  'GET',
  '/backend/v1/debug/retencao',
  (e) => {
    try {
      const agora = new Date()
      const iso = agora.toISOString()
      const hoje = iso.substring(0, iso.length - 1)

      // 1. Criar evento de teste com retido_ate vencido (contexto sistema).
      const audit = $app.findCollectionByNameOrId('auditoria')
      const fixture = new Record(audit)
      fixture.set('entidade', 'clientes')
      fixture.set('registro_id', 'fixture-retencao-t205')
      fixture.set('acao', 'create')
      fixture.set('ator_id', e.auth.id)
      fixture.set('ocorrido_em', '2025-01-01 00:00:00.000')
      fixture.set('estado_anterior', '')
      fixture.set('estado_posterior', '{"teste":"retencao"}')
      fixture.set('retido_ate', '2026-01-01 00:00:00.000')
      $app.save(fixture)

      // 2. Rodar a mesma lógica do cron.
      let vencidos = []
      try {
        vencidos = $app.findRecordsByFilter(
          'auditoria',
          'retido_ate != "" && retido_ate < {:hoje}',
          '',
          1000,
          0,
          { hoje: hoje },
        )
      } catch (err) {
        return e.json(500, { erro_busca: String(err) })
      }

      let removidos = 0
      const ids = []
      for (let i = 0; i < vencidos.length; i++) {
        ids.push(vencidos[i].id)
        try {
          $app.delete(vencidos[i])
          removidos++
        } catch (err) {
          return e.json(500, { erro_delete: String(err) })
        }
      }

      return e.json(200, {
        fixture_criada_e_removida: ids.length > 0,
        vencidos_encontrados: vencidos.length,
        removidos: removidos,
        ids: ids,
      })
    } catch (err) {
      return e.json(500, { erro_geral: String(err) })
    }
  },
  $apis.requireAuth(),
)
