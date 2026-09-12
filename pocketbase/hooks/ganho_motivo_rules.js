// T3.01 — CA-3-001: motivo de ganho estruturado (espelho da regra de perda T2.14).
// REQUEST hook onRecordUpdateRequest em negocios — roda antes do model hook de
// permanência: um bloqueio aqui nunca corrompe o histórico (padrão outcome_rules.js).
// Regras:
// 1) estagio → 'fechado_ganho' (nova transição) exige motivo_ganho estruturado;
// 2) motivo_ganho = 'outro' exige motivo_ganho_detalhe;
// 3) motivo_ganho preenchido sem estar em fechado_ganho é rejeitado (coerência);
// 4) edição de registro já ganho sem mudança de motivo não reexige (idempotente);
// 5) tentativa negada é registrada em log estruturado (padrão T2.15).
// A criação de handoff continua em handoff_ganho.js (dono único — lição T2.34).
onRecordUpdateRequest((e) => {
  const before = e.record.original()
  const previousStage = String(before.get('estagio') || '')
  const nextStage = String(e.record.get('estagio') || '')
  const ganhoReasons = [
    'preco',
    'escopo',
    'relacionamento',
    'urgencia',
    'indicacao_interna',
    'outro',
  ]

  const virouGanho = nextStage === 'fechado_ganho' && previousStage !== 'fechado_ganho'
  const editandoGanho = nextStage === 'fechado_ganho' && previousStage === 'fechado_ganho'

  if (virouGanho) {
    const motivo = String(e.record.get('motivo_ganho') || '').trim()
    if (!motivo) {
      const msg = 'Ganho exige um motivo estruturado: por que o cliente fechou?'
      $app
        .logger()
        .error(
          'T301 tentativa negada',
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
          msg,
          'quando',
          new Date().toISOString(),
        )
      throw new Error(msg)
    }
    if (!ganhoReasons.includes(motivo)) {
      throw new Error('Motivo de ganho inválido. Escolha um dos motivos estruturados.')
    }
    if (motivo === 'outro' && !String(e.record.get('motivo_ganho_detalhe') || '').trim()) {
      throw new Error('Informe o detalhe do motivo de ganho.')
    }
  }

  if (editandoGanho) {
    // Edição de um registro já ganho: se motivo_ganho está sendo preenchido
    // agora, valida; se está sendo REMOVIDO, bloqueia (não apaga histórico).
    const motivo = String(e.record.get('motivo_ganho') || '').trim()
    const motivoAnterior = String(before.get('motivo_ganho') || '').trim()
    if (motivo && !ganhoReasons.includes(motivo)) {
      throw new Error('Motivo de ganho inválido. Escolha um dos motivos estruturados.')
    }
    if (motivo === 'outro' && !String(e.record.get('motivo_ganho_detalhe') || '').trim()) {
      throw new Error('Informe o detalhe do motivo de ganho.')
    }
    if (motivoAnterior && !motivo) {
      throw new Error('O motivo de ganho registrado não pode ser removido.')
    }
  }

  if (nextStage !== 'fechado_ganho') {
    const motivoAtual = String(e.record.get('motivo_ganho') || '').trim()
    if (previousStage === 'fechado_ganho' && motivoAtual) {
      // Reabertura de um ganho: o motivo é da decisão encerrada — limpa sem
      // bloquear (a trilha de auditoria preserva o valor anterior).
      e.record.set('motivo_ganho', '')
      e.record.set('motivo_ganho_detalhe', '')
    } else if (motivoAtual && previousStage !== 'fechado_ganho') {
      throw new Error('Motivo de ganho só vale em oportunidade ganha.')
    }
  }

  e.next()
}, 'negocios')
