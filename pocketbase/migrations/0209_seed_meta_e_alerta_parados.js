migrate(
  (app) => {
    // 1. Garantir registro de meta de vendas mensal em metas_indicadores se não existir
    try {
      app.findFirstRecordByData('metas_indicadores', 'chave', 'meta_vendas_mensal')
    } catch (_) {
      const colMetas = app.findCollectionByNameOrId('metas_indicadores')
      const recMeta = new Record(colMetas)
      recMeta.set('chave', 'meta_vendas_mensal')
      recMeta.set('papel', 'comercial')
      recMeta.set('valor_meta', 50000) // Meta padrão R$ 50.000,00 editável
      recMeta.set('periodicidade', 'mensal')
      recMeta.set('ativo', true)
      recMeta.set('descricao', 'Meta mensal de vendas contratadas em novos negócios ganhos.')
      app.save(recMeta)
    }

    // 2. Garantir registro de dias de alerta de negócios parados em configuracoes_operacionais
    try {
      app.findFirstRecordByData(
        'configuracoes_operacionais',
        'chave',
        'dias_alerta_negocios_parados',
      )
    } catch (_) {
      const colConfig = app.findCollectionByNameOrId('configuracoes_operacionais')
      const recConfig = new Record(colConfig)
      recConfig.set('chave', 'dias_alerta_negocios_parados')
      recConfig.set('valor_numero', 7) // Padrão 7 dias configurável
      recConfig.set(
        'descricao',
        'Limite em dias sem atualização para alertar negócio parado no funil.',
      )
      app.save(recConfig)
    }
  },
  (app) => {
    try {
      const recMeta = app.findFirstRecordByData('metas_indicadores', 'chave', 'meta_vendas_mensal')
      if (recMeta) app.delete(recMeta)
    } catch (_) {}

    try {
      const recConfig = app.findFirstRecordByData(
        'configuracoes_operacionais',
        'chave',
        'dias_alerta_negocios_parados',
      )
      if (recConfig) app.delete(recConfig)
    } catch (_) {}
  },
)
