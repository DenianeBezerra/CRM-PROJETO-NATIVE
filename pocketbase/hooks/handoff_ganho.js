// T2.31 — CA-2-026: ganho cria handoff idempotente.
// MODEL hook onRecordUpdate em negocios (dentro da transação do save):
// - dispara quando estagio vira 'fechado_ganho';
// - cria o handoff com checklist padrão do onboarding Vibratto, origem
//   (serviço da oportunidade), emissor (ator do ganho) e receptor
//   (responsável da oportunidade — ajustável na T2.33);
// - IDEMPOTENTE: se já existe handoff para o negócio, não duplica e NÃO
//   sobrescreve decisão existente (status/aceite preservados).
// Lições JSVM: lógica inline no callback, datas PB " " → "T".
onRecordUpdate((e) => {
  let antes = ''
  let depois = ''
  try {
    antes = String(e.record.original().get('estagio') || '')
    depois = String(e.record.get('estagio') || '')
  } catch (err) {
    $app.logger().error('T231 falha ao ler estagios', 'error', String(err))
    return e.next()
  }
  if (depois !== 'fechado_ganho' || antes === 'fechado_ganho') return e.next()

  const negocioId = e.record.id
  const ator = e.auth ? e.auth.id : ''
  const origem = String(e.record.get('servico') || 'outro') || 'outro'
  const receptor = String(e.record.get('responsavel') || '') || ator
  const observacao = String(e.record.get('observacao_ganho') || '')

  // Checklist padrão do onboarding Vibratto (3 frentes).
  // T2.32/CA-2-027: itens críticos são OBRIGATÓRIOS — sem eles o aceite é
  // bloqueado e gera pendência com dono e prazo (endpoint de aceite).
  const checklistPadrao = [
    { item: 'Contrato assinado e arquivado', obrigatorio: true, feito: false },
    { item: 'Documentos fiscais e societários recebidos', obrigatorio: true, feito: false },
    {
      item: 'Acessos aos sistemas do cliente (Omie/Conta Azul/Nibo)',
      obrigatorio: true,
      feito: false,
    },
    { item: 'Reunião de kickoff agendada', obrigatorio: false, feito: false },
    { item: 'Escopo e rotinas transferidos para a operação', obrigatorio: false, feito: false },
  ]

  // Idempotência: UNIQUE negocio — se já existe, preserva.
  let existente = []
  try {
    existente = $app.findRecordsByFilter('handoffs', 'negocio = "' + negocioId + '"', '', 1, 0)
  } catch (err) {
    $app.logger().error('T231 falha ao checar handoff existente', 'error', String(err))
    throw new Error('Falha ao verificar handoff existente.')
  }
  if (existente.length > 0) {
    // Não duplica, não sobrescreve decisão (status/aceite preservados).
    return e.next()
  }

  const col = $app.findCollectionByNameOrId('handoffs')
  const rec = new Record(col)
  rec.set('negocio', negocioId)
  rec.set('origem', origem)
  rec.set('responsavel_emissor', ator)
  rec.set('responsavel_receptor', receptor)
  rec.set('status', 'pendente')
  rec.set('checklist', JSON.stringify(checklistPadrao))
  rec.set('observacao_ganho', observacao)
  rec.set('criado_em', new Date().toISOString().replace('T', ' '))
  try {
    $app.save(rec)
    $app.logger().info('T231 handoff criado no ganho', 'negocio', negocioId, 'emissor', ator)
  } catch (err) {
    // T2.34/CA-2-029: ganho simultâneo — o índice UNIQUE (negocio) garante
    // exatamente um handoff. Conflito de unique = outro ganho venceu: loga,
    // confirma que existe exatamente 1 e NÃO sobrescreve nada.
    const msg = String(err)
    if (msg.indexOf('unique') >= 0 || msg.indexOf('UNIQUE') >= 0) {
      let total = -1
      try {
        total = $app.findRecordsByFilter(
          'handoffs',
          'negocio = "' + negocioId + '"',
          '',
          1,
          0,
        ).length
      } catch (_) {}
      $app
        .logger()
        .info(
          'T234 ganho simultaneo: handoff unico preservado',
          'negocio',
          negocioId,
          'handoffs',
          total,
        )
    } else {
      // Falha na criação do handoff NÃO pode quebrar o ganho — loga e segue.
      $app.logger().error('T231 falha ao criar handoff', 'error', msg)
    }
  }

  e.next()
}, 'negocios')
