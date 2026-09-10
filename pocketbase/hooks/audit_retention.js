// T2.05 / CA-2-040 — cumprimento automático da política de retenção da auditoria.
// Todo dia às 03:00 (fuso do servidor), eventos com retido_ate vencido são
// removidos. A trilha permanece append-only para a API; a retenção é tarefa
// interna de ciclo de vida, executada com $app (contexto de sistema, sem ator).

cronAdd('auditoria_retencao', '0 3 * * *', () => {
  const agora = new Date()
  const iso = agora.toISOString()
  const hoje = iso.substring(0, iso.length - 1)

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
    $app.logger().error('Retenção da auditoria: falha ao localizar vencidos', 'error', String(err))
    return
  }

  let removidos = 0
  for (let i = 0; i < vencidos.length; i++) {
    try {
      $app.delete(vencidos[i])
      removidos++
    } catch (err) {
      $app.logger().error('Retenção da auditoria: falha ao remover evento', 'error', String(err))
    }
  }

  if (removidos > 0) {
    $app.logger().info('Retenção da auditoria executada', 'removidos', removidos)
  }
})
