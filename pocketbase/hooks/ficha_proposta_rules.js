// T3.02b — regra server-side da ficha (v8 final): motivo_atualizacao
// obrigatório no CREATE (request hook, provado). A exigência no UPDATE é
// garantida pela API rule da coleção (migration 0137) — os hooks JSVM não
// expõem o before confiável para comparação (lição v2-v7).
onRecordCreateRequest((e) => {
  var motivo = String(e.record.get('motivo_atualizacao') || '').trim()
  if (motivo.length < 10) {
    throw new Error('Informe o motivo da atualização (mínimo 10 caracteres).')
  }
  e.next()
}, 'fichas_proposta')
