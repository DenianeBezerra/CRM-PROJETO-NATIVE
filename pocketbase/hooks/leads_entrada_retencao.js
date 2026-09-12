// T3.07/D5 (decisão CEO 13/09) — retenção de leads que não fecharam.
// Política: leads_entrada com status 'novo' (nunca vinculados) são ELIMINADOS
// 24 meses após a coleta ou o último contato, o que for mais recente.
// O "último contato" é a data do último evento na trilha (reenvio/dedup).
// Eliminação = dados de identificação removidos; o registro não é mantido
// anonimizado (a finalidade "contato comercial" se esgota — art. 15/16 LGPD).
// Padrão do audit_retention.js (T2.05): cron diário, $app contexto de sistema.
// Nota: delete direto via $app.delete é permitido em contexto de sistema
// (deleteRule null bloqueia apenas a API pública — mesmo padrão da auditoria).

var RETENCAO_MESES = 24

cronAdd('leads_entrada_retencao', '0 3 * * *', () => {
  var limite = new Date()
  limite.setMonth(limite.getMonth() - RETENCAO_MESES)
  var limiteISO = limite.toISOString().replace('T', ' ').substring(0, 19)

  var vencidos = []
  try {
    vencidos = $app.findRecordsByFilter(
      'leads_entrada',
      "status = 'novo' && created < {:limite}",
      '',
      1000,
      0,
      { limite: limiteISO },
    )
  } catch (err) {
    $app.logger().error('Retenção leads_entrada: falha ao localizar vencidos', 'error', String(err))
    return
  }

  var removidos = 0
  for (var i = 0; i < vencidos.length; i++) {
    try {
      // Último contato: maior data de evento na trilha (reenvio renova o prazo).
      var ultimoContato = String(vencidos[i].get('created') || '')
      try {
        var trilha = JSON.parse(String(vencidos[i].get('trilha') || '[]'))
        if (trilha.length) {
          var ultima = trilha[trilha.length - 1]
          if (ultima && ultima.quando && String(ultima.quando) > ultimoContato) {
            ultimoContato = String(ultima.quando)
          }
        }
      } catch (_) {}
      // Normaliza formato PB (" ") e ISO ("T") para comparação.
      var uc = String(ultimoContato).replace('T', ' ')
      if (uc && uc < limiteISO) {
        $app.delete(vencidos[i])
        removidos++
      }
    } catch (errDel) {
      $app.logger().error('Retenção leads_entrada: falha ao remover lead', 'error', String(errDel))
    }
  }

  if (removidos > 0) {
    $app.logger().info('Retenção leads_entrada executada', 'removidos', removidos)
  }
})
