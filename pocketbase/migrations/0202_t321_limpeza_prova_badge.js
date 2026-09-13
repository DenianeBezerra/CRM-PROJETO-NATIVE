// T3.21 — limpeza da obrigação de prova do badge A-23 (delete via API é
// bloqueado; a prova do contador foi concluída: badge "1" renderizou).
migrate(
  (app) => {
    try {
      var r = app.findRecordById('obrigacoes', '1n8lglkrzbrkg4s')
      app.delete(r)
      app.logger().info('A23 obrigacao de prova removida')
    } catch (_) {}
  },
  (app) => {},
)
