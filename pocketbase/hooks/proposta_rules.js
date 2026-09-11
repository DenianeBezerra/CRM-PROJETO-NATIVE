// T2.21 — CA-2-016: regras server-side do rascunho de proposta.
// - valor > 0, validade futura, responsável existente e ativo, resumo ≥ 20 chars;
// - versão sequencial calculada no servidor (o cliente não escolhe);
// - status inicial sempre 'rascunho' (emissão é a T2.22);
// - usuário autorizado = qualquer autenticado (createRule) — o gate de emissão
//   vem na T2.22.
// Lições JSVM: interpolação direta de IDs, datas PB normalizadas " " → "T",
// lógica inline nos callbacks (scoping).
onRecordCreateRequest((e) => {
  const resumo = String(e.requestInfo().body.resumo || '').trim()
  if (resumo.length < 20) {
    throw new Error('A proposta exige um resumo com pelo menos 20 caracteres.')
  }

  const valor = Number(e.requestInfo().body.valor)
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error('A proposta exige um valor maior que zero.')
  }

  const validade = String(e.requestInfo().body.validade || '').trim()
  let validadeOk = false
  if (validade && !validade.startsWith('0001-01-01')) {
    const ms = Date.parse(validade.replace(' ', 'T'))
    if (!isNaN(ms) && ms >= Date.now() - 60 * 1000) validadeOk = true
  }
  if (!validadeOk) {
    throw new Error('A proposta exige uma validade com data futura.')
  }

  const responsavel = String(e.requestInfo().body.responsavel || '').trim()
  if (!responsavel) {
    throw new Error('A proposta exige um responsável.')
  }
  try {
    const resp = $app.findRecordById('_pb_users_auth_', responsavel)
    if (resp.get('active') === false) {
      throw new Error('O responsável informado está inativo.')
    }
  } catch (err) {
    if (String(err).indexOf('inativo') >= 0) throw err
    throw new Error('Responsável não encontrado.')
  }

  const negocioId = String(e.requestInfo().body.negocio || '').trim()
  try {
    $app.findRecordById('negocios', negocioId)
  } catch (_) {
    throw new Error('Oportunidade da proposta não encontrada.')
  }

  // Versão sequencial por negócio, calculada no servidor.
  let ultima = 0
  try {
    const anteriores = $app.findRecordsByFilter(
      'propostas',
      'negocio = "' + negocioId + '"',
      '-versao',
      1,
      0,
    )
    if (anteriores.length > 0) ultima = Number(anteriores[0].get('versao')) || 0
  } catch (err) {
    $app.logger().error('T221 falha ao calcular versão', 'error', String(err))
    throw new Error('Falha ao validar a versão da proposta.')
  }

  e.record.set('versao', ultima + 1)
  e.record.set('resumo', resumo)
  e.record.set('valor', valor)
  e.record.set('validade', validade.replace('T', ' '))
  e.record.set('status', 'rascunho')
  if (!e.record.get('criado_por')) {
    e.record.set('criado_por', e.auth ? e.auth.id : '')
  }
  e.next()
}, 'propostas')

// Rascunho editável; emissão/decisão muda o status — a transição de status
// é validada aqui (T2.22 detalha a emissão; T2.24 a decisão humana).
onRecordUpdateRequest((e) => {
  const antes = String(e.record.original().get('status') || '')
  const depois = String(e.record.get('status') || '')

  // Não pode voltar de emitida/aceita/recusada para rascunho.
  if (antes !== 'rascunho' && depois === 'rascunho') {
    throw new Error('Uma proposta emitida não volta para rascunho.')
  }
  // Mudança de conteúdo em proposta emitida é proibida (T2.22 congela a versão).
  if (antes === 'emitida' || antes === 'aceita' || antes === 'recusada') {
    const campos = ['valor', 'validade', 'resumo', 'responsavel', 'negocio']
    for (let i = 0; i < campos.length; i++) {
      const campo = campos[i]
      const vAntes = e.record.original().get(campo)
      const vDepois = e.record.get(campo)
      if (String(vAntes) !== String(vDepois)) {
        throw new Error('Proposta emitida é imutável: crie uma nova versão para mudar o conteúdo.')
      }
    }
  }
  e.next()
}, 'propostas')

onRecordDeleteRequest((e) => {
  throw new Error('Proposta não pode ser excluída (histórico comercial preservado).')
}, 'propostas')
