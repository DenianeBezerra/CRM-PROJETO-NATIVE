// T2.29 — CA-2-024: pausa, reabertura, usuário inativo e concorrência.
// REQUEST hooks (create + update em negocios), lógica INLINE (scoping JSVM):
// 1) PAUSA: status → 'pausado' exige motivo_pausa (≥ 10 chars); pausa não
//    coexiste com etapa final;
// 2) REABERTURA: sair de 'pausado' exige justificativa_reabertura (≥ 10 chars)
//    e volta para um status não-final; o evento fica na auditoria (hook T2.05);
// 3) USUÁRIO INATIVO: responsável inativo rejeitado em qualquer transição
//    (estende o guard T2.19 para pausa/reabertura);
// 4) CONCORRÊNCIA: versao_registro é incrementado server-side a cada update;
//    o cliente deve enviar a versão que leu — versão divergente é rejeitada
//    (409 lógico), preservando a primeira escrita de duas atualizações
//    concorrentes.
// Lições JSVM: datas PB " " → "T", lógica inline nos callbacks.
onRecordCreateRequest((e) => {
  const status = String(e.record.get('status') || '').trim()
  const estagio = String(e.record.get('estagio') || '').trim()

  if (status === 'pausado') {
    const motivo = String(e.requestInfo().body.motivo_pausa || '').trim()
    if (motivo.length < 10) {
      throw new Error(
        'Pausar exige o motivo: descreva por que a oportunidade entra em pausa (mínimo 10 caracteres).',
      )
    }
    e.record.set('motivo_pausa', motivo)
    if (estagio === 'fechado_ganho' || estagio === 'fechado_perdido') {
      throw new Error('Pausa não coexiste com etapa final.')
    }
  }

  if (!e.record.get('versao_registro')) {
    e.record.set('versao_registro', 1)
  }
  e.next()
}, 'negocios')

onRecordUpdateRequest((e) => {
  const antes = String(e.record.original().get('status') || '').trim()
  const depois = String(e.record.get('status') || '').trim()
  const estagio = String(e.record.get('estagio') || '').trim()

  // ---- 4) Concorrência otimista ----
  const versaoAtual = Number(e.record.original().get('versao_registro')) || 1
  const versaoEnviada = e.requestInfo().body.versao_registro
  if (versaoEnviada !== undefined && versaoEnviada !== null && String(versaoEnviada) !== '') {
    const v = Number(versaoEnviada)
    if (!Number.isFinite(v) || v !== versaoAtual) {
      throw new Error(
        'Conflito de concorrência: a oportunidade foi atualizada por outra pessoa (versão lida ' +
          v +
          ', versão atual ' +
          versaoAtual +
          '). Recarregue e refaça a alteração.',
      )
    }
  }
  e.record.set('versao_registro', versaoAtual + 1)

  // ---- 1) Pausa estruturada ----
  if (depois === 'pausado' && antes !== 'pausado') {
    const motivo = String(e.requestInfo().body.motivo_pausa || '').trim()
    if (motivo.length < 10) {
      throw new Error(
        'Pausar exige o motivo: descreva por que a oportunidade entra em pausa (mínimo 10 caracteres).',
      )
    }
    e.record.set('motivo_pausa', motivo)
    if (estagio === 'fechado_ganho' || estagio === 'fechado_perdido') {
      throw new Error('Pausa não coexiste com etapa final.')
    }
  }

  // ---- 2) Reabertura auditável ----
  if (antes === 'pausado' && depois !== 'pausado') {
    const justificativa = String(e.requestInfo().body.justificativa_reabertura || '').trim()
    if (justificativa.length < 10) {
      throw new Error(
        'Reabrir exige a justificativa: descreva o que mudou para sair da pausa (mínimo 10 caracteres).',
      )
    }
    e.record.set('justificativa_reabertura', justificativa)
    if (depois === 'ganho' || depois === 'perdido') {
      throw new Error('Reabertura não pode apontar direto para status final.')
    }
    // Reabrir restaura o fluxo saudável: próxima ação futura volta a ser
    // exigida (o guard oportunidade_saudavel também roda neste update).
  }

  // ---- 3) Usuário inativo em qualquer transição ----
  const responsavel = String(e.record.get('responsavel') || '').trim()
  if (responsavel) {
    let respAtivo = true
    try {
      const resp = $app.findRecordById('_pb_users_auth_', responsavel)
      respAtivo = resp.get('active') !== false
    } catch (_) {
      throw new Error('Responsável não encontrado.')
    }
    if (!respAtivo) {
      throw new Error(
        'O responsável informado está inativo. Reative a conta ou escolha outro responsável.',
      )
    }
  }

  e.next()
}, 'negocios')
