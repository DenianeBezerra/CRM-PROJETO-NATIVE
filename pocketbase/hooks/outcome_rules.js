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
      let motivoNegativa = ''
      if (!desc) {
        motivoNegativa =
          'Desqualificação exige a próxima ação: descreva o que acontece a partir daqui.'
      } else if (!quando || quando.startsWith('0001-01-01')) {
        motivoNegativa = 'Desqualificação exige a data da próxima ação.'
      } else {
        const quandoMs = Date.parse(quando.replace(' ', 'T'))
        if (isNaN(quandoMs)) {
          motivoNegativa = 'Data da próxima ação inválida.'
        } else if (quandoMs < Date.now() - 60 * 1000) {
          motivoNegativa = 'A data da próxima ação deve ser futura.'
        }
      }
      if (motivoNegativa) {
        // T2.15/CA-2-010: trilha da tentativa negada em log estruturado.
        // LIMITAÇÃO TÉCNICA (documentada): em request hook do JSVM v0.36,
        // qualquer $app.save participa da transação do request — um evento
        // gravado antes do erro é revertido pelo rollback (provado por API).
        $app
          .logger()
          .error(
            'T2.15 tentativa negada',
            'entidade',
            'negocios',
            'registro_id',
            e.record.id,
            'ator_id',
            e.auth ? e.auth.id : '',
            'etapa_anterior',
            previousStage,
            'etapa_tentada',
            nextStage,
            'motivo',
            motivoNegativa,
            'quando',
            new Date().toISOString(),
          )
        throw new Error(motivoNegativa)
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
