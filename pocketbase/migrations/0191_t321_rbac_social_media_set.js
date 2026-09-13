// T3.21 — SPEC-3-021 (cap. 11): bloqueio social_media — versão via col.set()
// (lição AP-0200: atribuição direta de propriedade pode não persistir no JSVM;
// .set() é o caminho provado para campos de coleção neste runtime).
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
        col.set('listRule', regra)
        col.set('viewRule', regra)
        col.set('createRule', regra)
        col.set('updateRule', regra)
        app.save(col)
        ajustadas++
      } catch (_) {}
    }
    app.logger().info('T321 RBAC social_media via set', 'ajustadas', ajustadas)
  },
  (app) => {},
)
