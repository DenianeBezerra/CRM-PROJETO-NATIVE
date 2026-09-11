// T2.31/T2.34 — CA-2-026 + CA-2-029: ganho cria handoff idempotente.
// REQUEST hook onRecordUpdateRequest em negocios (padrão audit_crm_changes.js):
// request hooks demonstradamente rodam no runtime atual e possuem e.auth —
// o model hook equivalente parou de disparar (provado por API em 2026-09-12:
// 8+ transições de ganho, 0 handoffs; bloco duplicado em
// comercial_fields_rules.js removido — dono único deste arquivo).
// Fluxo: captura antes/depois → e.next() (conclui o save) → cria o handoff.
// - dispara quando estagio vira 'fechado_ganho' (e não estava);
// - checklist padrão do onboarding Vibratto (obrigatórios marcados, T2.32);
// - IDEMPOTENTE: índice UNIQUE (negocio) + check prévio — ganho simultâneo
//   cria exatamente um handoff; decisão existente NUNCA é sobrescrita;
// - conflito de UNIQUE = outro ganho venceu: loga e preserva;
// - falha na criação NÃO quebra o ganho (loga e segue).
// Lições JSVM: datas PB " " → "T"; lógica inline; JSON.parse(String(raw)).
onRecordUpdateRequest((e) => {
  let antes = ''
  let depois = ''
  try {
    antes = String(e.record.original().get('estagio') || '')
    depois = String(e.record.get('estagio') || '')
  } catch (err) {
    $app.logger().error('T234 falha ao ler estagios', 'error', String(err))
    e.next()
    return
  }

  // Conclui o save do negócio antes de qualquer escrita no handoff.
  e.next()

  if (depois !== 'fechado_ganho' || antes === 'fechado_ganho') return

  const negocioId = e.record.id
  const ator = e.auth ? e.auth.id : ''
  const origem = String(e.record.get('servico') || 'outro') || 'outro'
  const receptor = String(e.record.get('responsavel') || '') || ator
  const observacao = String(e.record.get('observacao_ganho') || '')

  // Checklist padrão do onboarding Vibratto (3 frentes).
  // T2.32/CA-2-027: itens críticos são OBRIGATÓRIOS — sem eles o aceite é
  // bloqueado e gera pendência com dono e prazo (endpoint de decisão).
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

  // Idempotência: se já existe, não duplica e NÃO sobrescreve decisão.
  let existente = []
  try {
    existente = $app.findRecordsByFilter('handoffs', 'negocio = "' + negocioId + '"', '', 1, 0)
  } catch (err) {
    $app.logger().error('T234 falha ao checar handoff existente', 'error', String(err))
    return
  }
  if (existente.length > 0) {
    $app.logger().info('T234 ganho repetido: handoff existente preservado', 'negocio', negocioId)
    return
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
    $app.logger().info('T234 handoff criado no ganho', 'negocio', negocioId, 'emissor', ator)
  } catch (err) {
    // T2.34/CA-2-029: ganho simultâneo — o índice UNIQUE (negocio) garante
    // exatamente um handoff. Conflito de unique = outro ganho venceu.
    const msg = String(err)
    if (msg.indexOf('unique') >= 0 || msg.indexOf('UNIQUE') >= 0) {
      $app.logger().info('T234 ganho simultaneo: handoff unico preservado', 'negocio', negocioId)
    } else {
      $app.logger().error('T234 falha ao criar handoff', 'error', msg)
    }
  }
}, 'negocios')
