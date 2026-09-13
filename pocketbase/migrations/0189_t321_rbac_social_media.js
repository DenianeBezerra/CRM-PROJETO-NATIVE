// T3.21 — SPEC-3-021 (cap. 11): social media é prestadora externa — a restrição
// de acesso aos demais módulos é requisito, não preferência. Regras de coleção:
// comerciais e operacionais exigem role != social_media (além do comercial já
// bloqueado pela 0167). Conteúdo/biblioteca têm regras próprias na 0188.
migrate(
  (app) => {
    var colecoes = [
      'negocios',
      'clientes',
      'empresas',
      'obrigacoes',
      'excecoes',
      'implantacoes',
      'implantacao_etapas',
      'fichas_operacionais',
      'ficha_canais',
      'ficha_bancos',
      'ficha_pessoas',
      'ficha_versions',
      'handoffs',
      'tarefas',
      'propostas',
      'contratos',
      'formularios',
      'fichas_proposta',
      'interacoes_whatsapp',
      'interacoes_email',
      'leads_entrada',
      'relatorios_agendados',
      'metas_indicadores',
      'automacoes',
      'automacoes_execucoes',
      'comentarios',
      'notificacoes',
    ]
    var ajustadas = 0
    for (var c = 0; c < colecoes.length; c++) {
      try {
        var col = app.findCollectionByNameOrId(colecoes[c])
        var regra =
          "@request.auth.id != '' && @request.auth.role != 'comercial' && @request.auth.role != 'social_media'"
        var mudou = false
        if (col.listRule !== null && String(col.listRule).indexOf('social_media') < 0) {
          col.listRule = regra
          mudou = true
        }
        if (col.viewRule !== null && String(col.viewRule).indexOf('social_media') < 0) {
          col.viewRule = regra
          mudou = true
        }
        if (
          col.createRule !== null &&
          String(col.createRule).indexOf('social_media') < 0 &&
          String(col.createRule).indexOf('@request.auth.id') >= 0
        ) {
          col.createRule = regra
          mudou = true
        }
        if (
          col.updateRule !== null &&
          String(col.updateRule).indexOf('social_media') < 0 &&
          String(col.updateRule).indexOf('@request.auth.id') >= 0
        ) {
          col.updateRule = regra
          mudou = true
        }
        if (mudou) {
          app.save(col)
          ajustadas++
        }
      } catch (_) {}
    }
    app.logger().info('T321 RBAC social_media', 'ajustadas', ajustadas)
  },
  (app) => {},
)
