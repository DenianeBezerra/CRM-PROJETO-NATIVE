migrate(
  (app) => {
    // T2.30 — CA-2-025: RBAC de visualização.
    // - operador vê somente ações/registros permitidos;
    // - administrador consulta configuração e trilha completa.
    //
    // Configuração (sla_config, perguntas_qualificacao): leitura passa a
    // admin-only — é configuração do processo, não dado operacional do dia.
    // A UI do OPERADOR não lê essas coleções (o modal de qualificação usa
    // perguntas... ver nota abaixo) — nota: QualificacaoNegocio lê
    // perguntas_qualificacao para renderizar o formulário de resposta.
    // Para não quebrar o operador, perguntas_qualificacao mantém leitura
    // para autenticados (são as perguntas que ele responde); a ESCRITA já é
    // admin-only. A configuração de SLA (sla_config) vira admin-only na
    // leitura — nada na UI do operador a consome.
    const sla = app.findCollectionByNameOrId('sla_config')
    sla.listRule = "@request.auth.role = 'admin'"
    sla.viewRule = "@request.auth.role = 'admin'"
    app.save(sla)

    // Trilhas de exportação: operator vê somente os PRÓPRIOS atos
    // (mesmo padrão da auditoria — T2.05); admin vê tudo.
    // Campo de ator nestas coleções é 'usuario' (relation), não 'ator_id'.
    const eventos = app.findCollectionByNameOrId('eventos_exportacao')
    eventos.listRule =
      "@request.auth.role = 'admin' || (@request.auth.id != '' && usuario = @request.auth.id)"
    eventos.viewRule =
      "@request.auth.role = 'admin' || (@request.auth.id != '' && usuario = @request.auth.id)"
    app.save(eventos)

    const exportacoes = app.findCollectionByNameOrId('exportacoes')
    exportacoes.listRule =
      "@request.auth.role = 'admin' || (@request.auth.id != '' && usuario = @request.auth.id)"
    exportacoes.viewRule =
      "@request.auth.role = 'admin' || (@request.auth.id != '' && usuario = @request.auth.id)"
    app.save(exportacoes)
  },
  (app) => {
    // Rollback: restaura leitura para qualquer autenticado.
    const sla = app.findCollectionByNameOrId('sla_config')
    sla.listRule = "@request.auth.id != ''"
    sla.viewRule = "@request.auth.id != ''"
    app.save(sla)

    const eventos = app.findCollectionByNameOrId('eventos_exportacao')
    eventos.listRule = "@request.auth.id != ''"
    eventos.viewRule = "@request.auth.id != ''"
    app.save(eventos)

    const exportacoes = app.findCollectionByNameOrId('exportacoes')
    exportacoes.listRule = "@request.auth.id != ''"
    exportacoes.viewRule = "@request.auth.id != ''"
    app.save(exportacoes)
  },
)
