// Regras de resultado comercial: perda, ganho e reabertura sem estado parcial.
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
