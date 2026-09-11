// T2.18 — CA-2-013: oportunidade ativa persiste responsável e próxima ação
// futura OU exceção vigente. A fila operacional é da SPEC-2-005 (fora daqui).
//
// REQUEST hook (onRecordCreateRequest + onRecordUpdateRequest em negocios):
// - "ativa" = estágio não-final (novo/contato_feito/proposta...) e não arquivada;
// - exige responsavel preenchido E proxima_acao_em com data futura;
// - exceção vigente (excecoes_qualificacao, não expirada) libera — reuso da
//   mesma coleção de exceções da qualificação (o "portão" é o mesmo: o dono
//   do negócio autorizou seguir sem os dados em dia);
// - fechado_ganho/fechado_perdido/arquivada não se aplicam.
//
// Lições JSVM: interpolação direta de IDs, datas PB normalizadas " " → "T",
// request hook antes do model hook de permanência (lição T2.13).

const validaOportunidadeSaudavel = function (e, negocioId, estagio, arquivado) {
  const ehFinal = estagio === 'fechado_ganho' || estagio === 'fechado_perdido'
  if (ehFinal || arquivado === true) {
    return // regra não se aplica
  }

  const responsavel = String(e.record.get('responsavel') || '').trim()
  const quando = String(e.record.get('proxima_acao_em') || '').trim()

  let problemas = []
  if (!responsavel) {
    problemas.push('responsável')
  }
  let quandoOk = false
  if (quando && !quando.startsWith('0001-01-01')) {
    const quandoMs = Date.parse(quando.replace(' ', 'T'))
    if (!isNaN(quandoMs) && quandoMs >= Date.now() - 60 * 1000) {
      quandoOk = true
    }
  }
  if (!quandoOk) {
    problemas.push('próxima ação com data futura')
  }

  if (problemas.length === 0) {
    return
  }

  // Exceção vigente libera (mesma coleção da qualificação — T2.13).
  let liberado = false
  try {
    const excecoes = $app.findRecordsByFilter(
      'excecoes_qualificacao',
      'negocio = "' + negocioId + '"',
      '-created',
      50,
      0,
    )
    const agora = Date.now()
    for (let i = 0; i < excecoes.length; i++) {
      const validade = Date.parse(String(excecoes[i].get('validade') || '').replace(' ', 'T'))
      if (!isNaN(validade) && validade >= agora) {
        liberado = true
        break
      }
    }
  } catch (err) {
    $app.logger().error('T218 falha ao consultar exceções', 'error', String(err))
  }
  if (liberado) {
    return
  }

  $app
    .logger()
    .error(
      'T2.15 tentativa negada',
      'entidade',
      'negocios',
      'registro_id',
      negocioId,
      'ator_id',
      e.auth ? e.auth.id : '',
      'motivo',
      'Oportunidade ativa sem ' + problemas.join(' e ') + '.',
      'quando',
      new Date().toISOString(),
    )

  throw new Error(
    'Oportunidade ativa exige ' +
      problemas.join(' e ') +
      ' — ou uma exceção vigente liberada por um administrador.',
  )
}

onRecordCreateRequest((e) => {
  const estagio = String(e.record.get('estagio') || '').trim()
  validaOportunidadeSaudavel(e, e.record.id, estagio, e.record.get('arquivado'))
  e.next()
}, 'negocios')

onRecordUpdateRequest((e) => {
  const estagio = String(e.record.get('estagio') || '').trim()
  const arquivado = e.record.get('arquivado') === true
  validaOportunidadeSaudavel(e, e.record.id, estagio, arquivado)
  e.next()
}, 'negocios')
