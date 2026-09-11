// Regras de resultado comercial: perda, ganho e reabertura sem estado parcial.
// T2.14 — CA-2-009: desqualificação registra motivo estruturado, detalhe
// obrigatório para Outro e próxima ação quando aplicável. Regra homologada:
// ao desqualificar (fechado_perdido), a oportunidade exige próxima ação com
// data futura e descrição — a porta de volta fica registrada no CRM.
// REQUEST hook: roda antes do model hook de permanência — um bloqueio aqui
// nunca corrompe o histórico (lição T2.13).
onRecordUpdateRequest((e) => {
  const before = e.record.original()
  const previousStage = before.get('estagio')
  const nextStage = e.record.get('estagio')
  const lossReasons = ['preco', 'concorrencia', 'sem_orcamento', 'timing', 'sem_retorno', 'outro']

  if (nextStage === 'fechado_perdido') {
    const reason = e.record.get('motivo_perda')
    if (!lossReasons.includes(reason)) throw new Error('Perda exige um motivo estruturado.')
    if (reason === 'outro' && !String(e.record.get('motivo_perda_detalhe') || '').trim()) {
      throw new Error('Informe o detalhe do motivo de perda.')
    }
    // CA-2-009: próxima ação obrigatória ao desqualificar (nova desqualificação
    // — voltar a editar um registro já perdido não reexige).
    if (previousStage !== 'fechado_perdido') {
      const desc = String(e.record.get('proxima_acao_descricao') || '').trim()
      const quando = String(e.record.get('proxima_acao_em') || '').trim()
      if (!desc) {
        throw new Error(
          'Desqualificação exige a próxima ação: descreva o que acontece a partir daqui.',
        )
      }
      if (!quando || quando.startsWith('0001-01-01')) {
        throw new Error('Desqualificação exige a data da próxima ação.')
      }
      const quandoMs = Date.parse(quando.replace(' ', 'T'))
      if (isNaN(quandoMs)) {
        throw new Error('Data da próxima ação inválida.')
      }
      if (quandoMs < Date.now() - 60 * 1000) {
        throw new Error('A data da próxima ação deve ser futura.')
      }
    }
  }

  if (nextStage === 'fechado_ganho') {
    if (previousStage !== 'fechado_ganho' && !e.record.get('data_ganho')) {
      e.record.set('data_ganho', new Date().toISOString())
    }
  }

  const reopening =
    (previousStage === 'fechado_ganho' || previousStage === 'fechado_perdido') &&
    nextStage !== previousStage
  if (reopening) {
    if (!String(e.record.get('justificativa_reabertura') || '').trim()) {
      throw new Error('Reabertura exige uma justificativa.')
    }
    if (nextStage === 'fechado_ganho' || nextStage === 'fechado_perdido') {
      throw new Error('Escolha uma etapa ativa para reabrir a oportunidade.')
    }
    const stages = $app.findCollectionByNameOrId('etapas_negocio')
    const active = $app.findRecordsByFilter(stages, 'chave = {:stage} && ativa = true', '', 1, 0, {
      stage: nextStage,
    })
    if (!active || active.length === 0)
      throw new Error('A etapa de destino está inativa ou não existe.')
  }
  e.next()
}, 'negocios')
