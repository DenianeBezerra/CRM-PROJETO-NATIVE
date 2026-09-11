// T2.16 — CA-2-011: regras server-side do diagnóstico versionado.
// - núcleo mínimo: resumo ≥ 20 caracteres (o que caracteriza um diagnóstico);
// - vínculo inequívoco: negocio obrigatório (relation required) e versão
//   sequencial calculada no servidor (o cliente não escolhe versão);
// - REQUEST hook: valida corpo cru (número da versão não vem do cliente) e
//   grava a versão correta antes do save — sem estado parcial.
// Lições JSVM: interpolação direta de IDs (sem bind params), sort por campo
// existente, datas normalizadas " " → "T".
onRecordCreateRequest((e) => {
  const resumo = String(e.requestInfo().body.resumo || '').trim()
  if (resumo.length < 20) {
    throw new Error('O diagnóstico exige um resumo com pelo menos 20 caracteres (núcleo mínimo).')
  }

  // Vínculo inequívoco: o negócio precisa existir.
  const negocioId = String(e.requestInfo().body.negocio || '').trim()
  let negocio
  try {
    negocio = $app.findRecordById('negocios', negocioId)
  } catch (_) {
    throw new Error('Oportunidade do diagnóstico não encontrada.')
  }

  // Versão sequencial calculada no servidor (o cliente não envia versão).
  let ultima = 0
  try {
    const anteriores = $app.findRecordsByFilter(
      'diagnosticos',
      'negocio = "' + negocio.id + '"',
      '-versao',
      1,
      0,
    )
    if (anteriores.length > 0) {
      ultima = Number(anteriores[0].get('versao')) || 0
    }
  } catch (err) {
    $app.logger().error('Falha ao calcular versão do diagnóstico', 'error', String(err))
    throw new Error('Falha ao validar a versão do diagnóstico.')
  }

  const novaVersao = ultima + 1
  e.record.set('versao', novaVersao)
  e.record.set('resumo', resumo)
  if (!e.record.get('criado_por')) {
    e.record.set('criado_por', e.auth ? e.auth.id : '')
  }

  // T2.17/CA-2-012: a partir da v2, toda nova versão exige o motivo da
  // atualização (a v1 é a criação — não tem motivo).
  const motivo = String(e.requestInfo().body.motivo_atualizacao || '').trim()
  if (novaVersao >= 2) {
    if (motivo.length < 10) {
      throw new Error(
        'A partir da segunda versão, o diagnóstico exige o motivo da atualização (mínimo 10 caracteres).',
      )
    }
    e.record.set('motivo_atualizacao', motivo)
  }

  e.next()
}, 'diagnosticos')

// Append-only: edição não sobrescreve (a T2.17 cria nova versão); delete bloqueado.
onRecordUpdateRequest((e) => {
  throw new Error('Diagnóstico é append-only: para alterar, crie uma nova versão.')
}, 'diagnosticos')

onRecordDeleteRequest((e) => {
  throw new Error('Diagnóstico é append-only: o registro não pode ser excluído.')
}, 'diagnosticos')
