// T3.12 — teste de carregamento: rota mínima + cronAdd.
routerAdd(
  'GET',
  '/backend/v1/motor-ping',
  (e) => {
    return e.json(200, { ok: true, pong: true })
  },
  $apis.requireAuth(),
)

cronAdd('motor_ping_cron', '10 9 * * *', () => {
  $app.logger().info('motor ping')
})
