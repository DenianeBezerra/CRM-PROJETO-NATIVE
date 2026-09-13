// T3.21 — SPEC-3-021 (cap. 11): bloqueio social_media nas coleções comerciais/
// operacionais. Versão INCONDICIONAL da 0189 (que pulava regras null — regra
// null em PocketBase = acesso público; precisa virar regra restritiva).
// Regra final: autenticado && role != comercial && role != social_media.
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
    var regra =
      "@request.auth.id != '' && @request.auth.role != 'comercial' && @request.auth.role != 'social_media'"
    var ajustadas = 0
    for (var c = 0; c < colecoes.length; c++) {
      try {
        var col = app.findCollectionByNameOrId(colecoes[c])
        var mudou = false
        if (String(col.listRule || '') !== regra) {
          col.listRule = regra
          mudou = true
        }
        if (String(col.viewRule || '') !== regra) {
          col.viewRule = regra
          mudou = true
        }
        if (String(col.createRule || '') !== regra) {
          col.createRule = regra
          mudou = true
        }
        if (String(col.updateRule || '') !== regra) {
          col.updateRule = regra
          mudou = true
        }
        if (mudou) {
          app.save(col)
          ajustadas++
        }
      } catch (_) {}
    }
    app.logger().info('T321 RBAC social_media incondicional', 'ajustadas', ajustadas)
  },
  (app) => {},
)
