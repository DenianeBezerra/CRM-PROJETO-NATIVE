// T3.21/Divergência exceção × atraso (CEO 16/09): as 3 exceções E1 abertas
// apontam para obrigações CONCLUÍDAS em 12/09 16:09 sem passar pela rota de
// baixa (conclusão direta no banco durante testes — sem auditoria de baixa).
// A resolução por baixa só roda na rota /baixa, então ficaram órfãs.
// C-01 está correto (atraso por data = 0); a divergência era exceção órfã.
// Esta migration resolve as órfãs; o fail-safe permanente vai no cron E1–E9.
migrate(
  (app) => {
    var ids = ['a98gwl1gapqlwja', 'rscd1mxs2qyj79i', '78rk2mej1jmck96']
    for (var i = 0; i < ids.length; i++) {
      try {
        var ex = app.findRecordById('excecoes', ids[i])
        if (String(ex.get('status') || '') !== 'aberta') continue
        var ob = app.findRecordById('obrigacoes', String(ex.get('obrigacao') || ''))
        if (String(ob.get('status') || '') === 'concluida') {
          ex.set('status', 'resolvida')
          ex.set('resolvida_em', new Date().toISOString())
          ex.set(
            'motivo_resolucao',
            'Obrigação vinculada já concluída — exceção órfã resolvida (limpeza 0199).',
          )
          app.save(ex)
          app.logger().info('T321 excecao orfa resolvida', ids[i])
        }
      } catch (err) {
        app.logger().error('T321 limpeza orfa falhou ' + ids[i], String(err))
      }
    }
  },
  (app) => {},
)
