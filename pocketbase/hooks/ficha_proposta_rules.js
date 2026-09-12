// T3.02b — regra server-side da ficha (v11 final): motivo_atualizacao
// obrigatório no CREATE e no UPDATE.
// - CREATE: request hook valida comprimento >= 10 (provado — 400 nos testes).
// - UPDATE: API rule exige motivo presente (migration 0137) + request hook
//   valida comprimento >= 10 lendo o motivo ENVIADO (não depende do before).
onRecordCreateRequest((e) => {
  var motivo = String(e.record.get('motivo_atualizacao') || '').trim()
  if (motivo.length < 10) {
    throw new Error('Informe o motivo da atualização (mínimo 10 caracteres).')
  }
  e.next()
}, 'fichas_proposta')

onRecordUpdateRequest((e) => {
  var motivo = String(e.record.get('motivo_atualizacao') || '').trim()
  if (motivo.length < 10) {
    throw new Error('Informe o motivo da atualização (mínimo 10 caracteres).')
  }
  e.next()
}, 'fichas_proposta')
