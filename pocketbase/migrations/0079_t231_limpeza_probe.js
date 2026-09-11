migrate(
  (app) => {
    // T2.31 — limpeza do handoff de prova da rota debug (checklist "probe").
    // A prova GREEN usou a rota debug para isolar a transação; o handoff criado
    // ali tem checklist de teste. Aqui ele é substituído pelo handoff real com
    // o checklist padrão do onboarding Vibratto.
    const probes = app.findRecordsByFilter('handoffs', 'observacao_ganho ~ "probe"', '', 10, 0)
    for (let i = 0; i < probes.length; i++) {
      app.delete(probes[i])
    }

    const checklistPadrao = [
      { item: 'Contrato assinado e arquivado', feito: false },
      { item: 'Documentos fiscais e societários recebidos', feito: false },
      { item: 'Acessos aos sistemas do cliente (Omie/Conta Azul/Nibo)', feito: false },
      { item: 'Reunião de kickoff agendada', feito: false },
      { item: 'Escopo e rotinas transferidos para a operação', feito: false },
    ]

    // Recria o handoff do negócio ganho na prova, com checklist padrão.
    const restantes = app.findRecordsByFilter('handoffs', 'negocio = "ek8vvnaisupsnga"', '', 1, 0)
    if (restantes.length === 0) {
      const col = app.findCollectionByNameOrId('handoffs')
      const rec = new Record(col)
      rec.set('negocio', 'ek8vvnaisupsnga')
      rec.set('origem', 'cfo_as_a_service')
      rec.set('responsavel_emissor', 'v86kq5x0v4guoym')
      rec.set('responsavel_receptor', 'v86kq5x0v4guoym')
      rec.set('status', 'pendente')
      rec.set('checklist', JSON.stringify(checklistPadrao))
      rec.set('observacao_ganho', 'handoff criado na prova GREEN da T2.31')
      rec.set('criado_em', new Date().toISOString().replace('T', ' '))
      app.save(rec)
    }
  },
  (app) => {
    // Down: sem reversão de dados — a coleção permanece.
  },
)
