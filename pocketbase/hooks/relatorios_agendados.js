// T3.19 — SPEC-3-019: relatórios salvos e agendados por e-mail (backlog Etapa 3 §2.3).
// Coleção relatorios_agendados (0185) + endpoints GET/POST/PATCH /relatorios,
// POST /relatorios/{id}/enviar (envio manual) + cron horário idempotente.
// Relatório resumo_direcao: HTML com KPIs do painel de direção do período —
// LGPD: só números agregados, sem dados pessoais de contato (guard T2.18: config, não comercial).
// Runtime goja: TODOS os helpers inline em cada callback (AP-0200 — nada top-level).
routerAdd(
  'GET',
  '/backend/v1/relatorios',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    // A-24 (CEO 16/09): relatórios agendados são camada de direção — só admin.
    if (String(actor.get('role') || '') !== 'admin')
      return e.json(403, { error: 'Relatórios agendados são exclusivos da direção.' })
    var rs = []
    try {
      rs = $app.findRecordsByFilter('relatorios_agendados', '', '-created', 200, 0)
    } catch (err) {
      return e.json(500, { error: 'Falha ao consultar agendamentos.' })
    }
    var itens = []
    for (var i = 0; i < rs.length; i++) {
      itens.push({
        id: rs[i].id,
        nome: String(rs[i].get('nome') || ''),
        tipo: String(rs[i].get('tipo') || ''),
        periodicidade: String(rs[i].get('periodicidade') || ''),
        dia_semana: Number(rs[i].get('dia_semana') || 0),
        hora_utc: Number(rs[i].get('hora_utc') || 0),
        destinatarios: String(rs[i].get('destinatarios') || ''),
        ativo: rs[i].get('ativo') === true,
        ultimo_envio_em: String(rs[i].get('ultimo_envio_em') || '') || null,
        ultimo_status: String(rs[i].get('ultimo_status') || '') || null,
      })
    }
    return e.json(200, { total: itens.length, itens: itens })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/relatorios',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    if (String(actor.get('role') || '') !== 'admin')
      return e.json(403, { error: 'Agendamento de relatórios é exclusivo do admin.' })
    var body = e.requestInfo().body
    var nome = String(body.nome || '').trim()
    var tipo = String(body.tipo || '').trim()
    var periodicidade = String(body.periodicidade || '').trim()
    var dia = Number(body.dia_semana)
    var hora = Number(body.hora_utc)
    var destinatarios = String(body.destinatarios || '').trim()
    if (!nome) return e.json(400, { error: 'Informe o nome do relatório.' })
    if (tipo !== 'resumo_direcao')
      return e.json(400, { error: 'Tipo inválido. Use: resumo_direcao.' })
    if (['semanal', 'mensal'].indexOf(periodicidade) < 0)
      return e.json(400, { error: 'Periodicidade inválida. Use: semanal ou mensal.' })
    if (!Number.isInteger(hora) || hora < 0 || hora > 23)
      return e.json(400, { error: 'hora_utc deve ser um número entre 0 e 23.' })
    if (periodicidade === 'semanal') {
      if (!Number.isInteger(dia) || dia < 1 || dia > 7)
        return e.json(400, { error: 'dia_semana deve ser 1 (segunda) a 7 (domingo) para semanal.' })
    }
    var lista = destinatarios.split(',')
    var emails = []
    for (var j = 0; j < lista.length; j++) {
      var em = lista[j].trim()
      if (!em) continue
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))
        return e.json(400, { error: 'E-mail inválido: ' + em })
      emails.push(em)
    }
    if (emails.length === 0)
      return e.json(400, { error: 'Informe ao menos um destinatário válido.' })
    var col = $app.findCollectionByNameOrId('relatorios_agendados')
    var rec = new Record(col)
    rec.set('nome', nome)
    rec.set('tipo', tipo)
    rec.set('periodicidade', periodicidade)
    rec.set('dia_semana', periodicidade === 'semanal' ? dia : 1)
    rec.set('hora_utc', hora)
    rec.set('destinatarios', emails.join(','))
    rec.set('ativo', body.ativo !== false)
    rec.set('criado_por', actor.id)
    rec.set('ultimo_status', 'pendente')
    try {
      $app.save(rec)
    } catch (err) {
      return e.json(400, { error: 'Falha ao salvar agendamento: ' + String(err) })
    }
    return e.json(200, { ok: true, id: rec.id, nome: nome, ativo: rec.get('ativo') === true })
  },
  $apis.requireAuth(),
)

routerAdd(
  'PATCH',
  '/backend/v1/relatorios/{id}',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    if (String(actor.get('role') || '') !== 'admin')
      return e.json(403, { error: 'Agendamento de relatórios é exclusivo do admin.' })
    var id = e.request.pathValue('id')
    var rec = null
    try {
      rec = $app.findRecordById('relatorios_agendados', id)
    } catch (_) {
      return e.json(404, { error: 'Agendamento não encontrado.' })
    }
    var body = e.requestInfo().body
    if (body.nome !== undefined) {
      var nome = String(body.nome || '').trim()
      if (!nome) return e.json(400, { error: 'Nome não pode ficar vazio.' })
      rec.set('nome', nome)
    }
    if (body.ativo !== undefined) rec.set('ativo', body.ativo === true)
    if (body.periodicidade !== undefined) {
      var per = String(body.periodicidade || '').trim()
      if (['semanal', 'mensal'].indexOf(per) < 0)
        return e.json(400, { error: 'Periodicidade inválida. Use: semanal ou mensal.' })
      rec.set('periodicidade', per)
    }
    if (body.dia_semana !== undefined) {
      var d = Number(body.dia_semana)
      if (!Number.isInteger(d) || d < 1 || d > 7)
        return e.json(400, { error: 'dia_semana deve ser 1 (segunda) a 7 (domingo).' })
      rec.set('dia_semana', d)
    }
    if (body.hora_utc !== undefined) {
      var h = Number(body.hora_utc)
      if (!Number.isInteger(h) || h < 0 || h > 23)
        return e.json(400, { error: 'hora_utc deve ser um número entre 0 e 23.' })
      rec.set('hora_utc', h)
    }
    if (body.destinatarios !== undefined) {
      var dest = String(body.destinatarios || '').trim()
      var lista = dest.split(',')
      var emails = []
      for (var j = 0; j < lista.length; j++) {
        var em = lista[j].trim()
        if (!em) continue
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))
          return e.json(400, { error: 'E-mail inválido: ' + em })
        emails.push(em)
      }
      if (emails.length === 0)
        return e.json(400, { error: 'Informe ao menos um destinatário válido.' })
      rec.set('destinatarios', emails.join(','))
    }
    try {
      $app.save(rec)
    } catch (err) {
      return e.json(400, { error: 'Falha ao salvar agendamento: ' + String(err) })
    }
    return e.json(200, { ok: true, id: rec.id })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/relatorios/{id}/enviar',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    if (String(actor.get('role') || '') !== 'admin')
      return e.json(403, { error: 'Envio de relatórios é exclusivo do admin.' })
    var id = e.request.pathValue('id')
    var rec = null
    try {
      rec = $app.findRecordById('relatorios_agendados', id)
    } catch (_) {
      return e.json(404, { error: 'Agendamento não encontrado.' })
    }
    if (String(rec.get('tipo') || '') !== 'resumo_direcao')
      return e.json(400, { error: 'Tipo de relatório não suportado.' })

    // ---- período: mês corrente (padrão do resumo) ----
    var agora = new Date()
    var inicio = new Date(agora.getUTCFullYear(), agora.getUTCMonth(), 1).getTime()
    var fim = agora.getTime()
    var duracao = fim - inicio
    var antFim = inicio
    var antInicio = inicio - duracao
    var dentro = function (raw, i, f) {
      var s = String(raw || '')
      if (!s || s.indexOf('0001-01-01') === 0) return false
      var ms = Date.parse(s.replace(' ', 'T'))
      if (isNaN(ms)) return false
      return ms >= i && ms < f
    }
    var FINAL = ['fechado_ganho', 'fechado_perdido']
    var SERV_REC = ['bpo_financeiro', 'tesouraria', 'controladoria']
    var calc = function (i, f) {
      var novosNegocios = 0
      var ganhos = 0
      var receitaNova = 0
      var propostasAbertas = 0
      var propostasParadas = 0
      var tarefasVencidas = 0
      var parados = 0
      var negocios = []
      try {
        negocios = $app.findRecordsByFilter('negocios', '', '-created', 20000, 0)
      } catch (_) {}
      var propostas = []
      try {
        propostas = $app.findRecordsByFilter('propostas', '', '-created', 20000, 0)
      } catch (_) {}
      var tarefas = []
      try {
        tarefas = $app.findRecordsByFilter('tarefas', "status = 'aberta'", '', 20000, 0)
      } catch (_) {}
      var agoraMs = Date.now()
      for (var i2 = 0; i2 < negocios.length; i2++) {
        var n = negocios[i2]
        if (dentro(n.get('created'), i, f)) novosNegocios++
        var status = String(n.get('status') || '')
        var estagio = String(n.get('estagio') || '')
        var arquivado = n.get('arquivado') === true
        if (status === 'ganho' && dentro(n.get('data_ganho') || n.get('updated'), i, f)) {
          ganhos++
          receitaNova += Number(n.get('valor') || 0)
        }
        if (!arquivado && FINAL.indexOf(estagio) < 0) {
          var up = Date.parse(String(n.get('updated') || '').replace(' ', 'T'))
          if (!isNaN(up) && (agoraMs - up) / 86400000 > 10) parados++
        }
      }
      for (var pr = 0; pr < propostas.length; pr++) {
        var prop = propostas[pr]
        if (String(prop.get('status') || '') !== 'emitida') continue
        var negAtivo = false
        for (var n2 = 0; n2 < negocios.length; n2++) {
          if (negocios[n2].id === String(prop.get('negocio') || '')) {
            negAtivo =
              negocios[n2].get('arquivado') !== true &&
              FINAL.indexOf(String(negocios[n2].get('estagio') || '')) < 0
            break
          }
        }
        if (!negAtivo) continue
        propostasAbertas++
        var emitida = String(prop.get('emitida_em') || prop.get('created') || '')
        var msEm = Date.parse(emitida.replace(' ', 'T'))
        if (!isNaN(msEm) && (agoraMs - msEm) / 86400000 > 10) propostasParadas++
      }
      for (var t = 0; t < tarefas.length; t++) {
        var prazo = String(tarefas[t].get('prazo') || '')
        if (prazo && prazo.indexOf('0001-01-01') !== 0) {
          var msP = Date.parse(prazo.replace(' ', 'T'))
          if (!isNaN(msP) && msP < agoraMs) tarefasVencidas++
        }
      }
      return {
        novos_negocios: novosNegocios,
        receita_nova: receitaNova,
        propostas_abertas: propostasAbertas,
        propostas_paradas: propostasParadas,
        tarefas_vencidas: tarefasVencidas,
        negocios_parados: parados,
      }
    }
    var atual = calc(inicio, fim)
    var anterior = calc(antInicio, antFim)
    var mrrDeTodos = 0
    try {
      var todos = $app.findRecordsByFilter(
        'negocios',
        "status = 'ganho' && arquivado = false",
        '',
        20000,
        0,
      )
      for (var m = 0; m < todos.length; m++) {
        var servico = String(todos[m].get('servico') || '')
        var valor = Number(todos[m].get('valor') || 0)
        if (!valor) continue
        if (SERV_REC.indexOf(servico) >= 0) mrrDeTodos += valor
        else if (String(todos[m].get('recorrencia') || 'mensal') === 'mensal') mrrDeTodos += valor
      }
    } catch (_) {}

    // Geração do HTML do relatório (inline — AP-0200: nada top-level; LGPD: só KPIs agregados).
    var gerarResumoDirecaoHtml = function (
      inicioMs,
      fimMs,
      mrrAtual,
      contagemAtual,
      contagemAnterior,
      urlPreview,
    ) {
      var fmtBRL = function (v) {
        var neg = v < 0
        var s = Math.abs(Math.round(v * 100) / 100)
          .toFixed(2)
          .replace('.', ',')
        var inteiro = s.split(',')[0]
        var mil = ''
        while (inteiro.length > 3) {
          mil = '.' + inteiro.slice(inteiro.length - 3) + mil
          inteiro = inteiro.slice(0, inteiro.length - 3)
        }
        return (neg ? '-' : '') + 'R$ ' + inteiro + mil + ',' + s.split(',')[1]
      }
      var pct = function (a, b) {
        if (a == null || b == null || b === 0) return '—'
        var p = ((a - b) / b) * 100
        return (p >= 0 ? '▲ +' : '▼ ') + p.toFixed(0) + '%'
      }
      var linha = function (rotulo, valor, anterior, unidade) {
        var v = valor == null ? '—' : unidade === 'moeda' ? fmtBRL(valor) : String(valor)
        var va = anterior == null ? '—' : unidade === 'moeda' ? fmtBRL(anterior) : String(anterior)
        return (
          '<tr><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-weight:600;">' +
          rotulo +
          '</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;">' +
          v +
          '</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;color:#6B7280;">' +
          va +
          '</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;color:#A8862B;">' +
          pct(valor, anterior) +
          '</td></tr>'
        )
      }
      var dI = new Date(inicioMs).toISOString().slice(0, 10)
      var dF = new Date(fimMs).toISOString().slice(0, 10)
      var html =
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#0A0A0A;">' +
        '<div style="background:#0A0A0A;padding:20px 24px;border-radius:8px 8px 0 0;">' +
        '<h1 style="color:#E8C766;margin:0;font-size:20px;">CRM Vibratto — Resumo da Direção</h1>' +
        '<p style="color:#C9A227;margin:4px 0 0;font-size:12px;">Período: ' +
        dI +
        ' a ' +
        dF +
        '</p>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px;background:#FFFFFF;border:1px solid #E5E7EB;">' +
        '<tr style="background:#F7F5F1;"><th style="text-align:left;padding:8px 12px;">Indicador</th><th style="text-align:right;padding:8px 12px;">Período</th><th style="text-align:right;padding:8px 12px;">Anterior</th><th style="text-align:right;padding:8px 12px;">Δ</th></tr>' +
        linha('MRR contratado', mrrAtual, null, 'moeda') +
        linha(
          'Novos negócios',
          contagemAtual.novos_negocios,
          contagemAnterior.novos_negocios,
          'numero',
        ) +
        linha('Receita nova', contagemAtual.receita_nova, contagemAnterior.receita_nova, 'moeda') +
        linha(
          'Propostas em aberto',
          contagemAtual.propostas_abertas,
          contagemAnterior.propostas_abertas,
          'numero',
        ) +
        linha(
          'Propostas paradas (&gt;10d)',
          contagemAtual.propostas_paradas,
          contagemAnterior.propostas_paradas,
          'numero',
        ) +
        linha(
          'Tarefas vencidas',
          contagemAtual.tarefas_vencidas,
          contagemAnterior.tarefas_vencidas,
          'numero',
        ) +
        linha(
          'Negócios parados',
          contagemAtual.negocios_parados,
          contagemAnterior.negocios_parados,
          'numero',
        ) +
        '</table>' +
        '<p style="font-size:12px;color:#6B7280;margin-top:12px;">Números agregados do CRM — sem dados pessoais. Abra o painel completo: <a href="' +
        urlPreview +
        '" style="color:#A8862B;">CRM Vibratto</a></p>' +
        '<p style="font-size:11px;color:#9CA3AF;margin-top:4px;">E-mail automático do CRM Vibratto. Se você não deveria recebê-lo, avise a direção.</p>' +
        '</div>'
      return html
    }

    var html = gerarResumoDirecaoHtml(
      inicio,
      fim,
      mrrDeTodos,
      atual,
      anterior,
      'https://tela-de-login-crm-a400a--preview.goskip.app/painel-direcao',
    )
    var assunto =
      'CRM Vibratto — Resumo da Direção (' +
      new Date(inicio).toISOString().slice(0, 10) +
      ' a ' +
      new Date(fim).toISOString().slice(0, 10) +
      ')'
    var destinatarios = String(rec.get('destinatarios') || '').split(',')
    var enviados = 0
    var falhas = 0
    var erroPrimeiro = ''
    var mailer = null
    try {
      mailer = $app.newMailClient()
    } catch (errMail) {
      $app.logger().error('T319 mail client indisponivel', 'error', String(errMail))
    }
    if (mailer) {
      for (var d = 0; d < destinatarios.length; d++) {
        var para = destinatarios[d].trim()
        if (!para) continue
        try {
          var msg = new MailerMessage({
            from: {
              address: $app.settings().meta.senderAddress,
              name: $app.settings().meta.senderName,
            },
            to: [{ address: para }],
            subject: assunto,
            html: html,
          })
          mailer.send(msg)
          enviados++
        } catch (errSend) {
          falhas++
          if (!erroPrimeiro) erroPrimeiro = String(errSend)
          $app.logger().error('T319 falha envio', 'para', para, 'error', String(errSend))
        }
      }
    } else {
      falhas = destinatarios.filter(function (x) {
        return x.trim()
      }).length
    }

    var parcial = enviados > 0 && falhas > 0
    rec.set('ultimo_envio_em', new Date().toISOString().replace('T', ' ').substring(0, 19))
    rec.set('ultimo_status', enviados > 0 ? 'enviado' : 'falhou')
    try {
      $app.save(rec)
    } catch (errS) {
      $app.logger().error('T319 falha ao atualizar status', 'error', String(errS))
    }
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'relatorios_agendados')
      ev.set('registro_id', rec.id)
      ev.set('acao', 'relatorio_enviado')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', '')
      ev.set(
        'estado_posterior',
        JSON.stringify({
          tipo: 'resumo_direcao',
          enviados: enviados,
          falhas: falhas,
          destinatarios: destinatarios.length,
        }),
      )
      $app.save(ev)
    } catch (errA) {
      $app.logger().error('T319 auditoria falhou', 'error', String(errA))
    }
    if (enviados === 0)
      return e.json(500, {
        error: 'Nenhum e-mail enviado. ' + (erroPrimeiro || 'Mail client indisponível.'),
      })
    return e.json(200, { ok: true, enviados: enviados, falhas: falhas, assunto: assunto })
  },
  $apis.requireAuth(),
)

// Cron horário (min 15 past) — idempotente por ultimo_envio_em (não reenvia na mesma hora).
// Semanal: dia_semana (1=segunda..7=domingo) + hora_utc. Mensal: dia 1 + hora_utc.
cronAdd('relatorios_agendados', '15 * * * *', () => {
  var agora = new Date()
  var horaUtc = agora.getUTCHours()
  var diaSemanaUtc = agora.getUTCDay() === 0 ? 7 : agora.getUTCDay() // JS: 0=domingo → 7
  var diaMesUtc = agora.getUTCDate()
  var y = agora.getUTCFullYear()
  var mo = agora.getUTCMonth()
  var inicio = new Date(Date.UTC(y, mo, 1)).getTime()
  var fim = agora.getTime()
  var duracao = fim - inicio
  var antFim = inicio
  var antInicio = inicio - duracao
  var dentro = function (raw, i, f) {
    var s = String(raw || '')
    if (!s || s.indexOf('0001-01-01') === 0) return false
    var ms = Date.parse(s.replace(' ', 'T'))
    if (isNaN(ms)) return false
    return ms >= i && ms < f
  }
  var FINAL = ['fechado_ganho', 'fechado_perdido']
  var SERV_REC = ['bpo_financeiro', 'tesouraria', 'controladoria']
  var calc = function (i, f) {
    var novosNegocios = 0
    var receitaNova = 0
    var propostasAbertas = 0
    var propostasParadas = 0
    var tarefasVencidas = 0
    var parados = 0
    var negocios = []
    try {
      negocios = $app.findRecordsByFilter('negocios', '', '-created', 20000, 0)
    } catch (_) {}
    var propostas = []
    try {
      propostas = $app.findRecordsByFilter('propostas', '', '-created', 20000, 0)
    } catch (_) {}
    var tarefas = []
    try {
      tarefas = $app.findRecordsByFilter('tarefas', "status = 'aberta'", '', 20000, 0)
    } catch (_) {}
    var agoraMs = Date.now()
    for (var i2 = 0; i2 < negocios.length; i2++) {
      var n = negocios[i2]
      if (dentro(n.get('created'), i, f)) novosNegocios++
      var status = String(n.get('status') || '')
      var estagio = String(n.get('estagio') || '')
      var arquivado = n.get('arquivado') === true
      if (status === 'ganho' && dentro(n.get('data_ganho') || n.get('updated'), i, f))
        receitaNova += Number(n.get('valor') || 0)
      if (!arquivado && FINAL.indexOf(estagio) < 0) {
        var up = Date.parse(String(n.get('updated') || '').replace(' ', 'T'))
        if (!isNaN(up) && (agoraMs - up) / 86400000 > 10) parados++
      }
    }
    for (var pr = 0; pr < propostas.length; pr++) {
      var prop = propostas[pr]
      if (String(prop.get('status') || '') !== 'emitida') continue
      var negAtivo = false
      for (var n2 = 0; n2 < negocios.length; n2++) {
        if (negocios[n2].id === String(prop.get('negocio') || '')) {
          negAtivo =
            negocios[n2].get('arquivado') !== true &&
            FINAL.indexOf(String(negocios[n2].get('estagio') || '')) < 0
          break
        }
      }
      if (!negAtivo) continue
      propostasAbertas++
      var emitida = String(prop.get('emitida_em') || prop.get('created') || '')
      var msEm = Date.parse(emitida.replace(' ', 'T'))
      if (!isNaN(msEm) && (agoraMs - msEm) / 86400000 > 10) propostasParadas++
    }
    for (var t = 0; t < tarefas.length; t++) {
      var prazo = String(tarefas[t].get('prazo') || '')
      if (prazo && prazo.indexOf('0001-01-01') !== 0) {
        var msP = Date.parse(prazo.replace(' ', 'T'))
        if (!isNaN(msP) && msP < agoraMs) tarefasVencidas++
      }
    }
    return {
      novos_negocios: novosNegocios,
      receita_nova: receitaNova,
      propostas_abertas: propostasAbertas,
      propostas_paradas: propostasParadas,
      tarefas_vencidas: tarefasVencidas,
      negocios_parados: parados,
    }
  }
  var mrrDeTodos = 0
  try {
    var todos = $app.findRecordsByFilter(
      'negocios',
      "status = 'ganho' && arquivado = false",
      '',
      20000,
      0,
    )
    for (var m = 0; m < todos.length; m++) {
      var servico = String(todos[m].get('servico') || '')
      var valor = Number(todos[m].get('valor') || 0)
      if (!valor) continue
      if (SERV_REC.indexOf(servico) >= 0) mrrDeTodos += valor
      else if (String(todos[m].get('recorrencia') || 'mensal') === 'mensal') mrrDeTodos += valor
    }
  } catch (_) {}
  var atual = calc(inicio, fim)
  var anterior = calc(antInicio, antFim)
  // Geração do HTML do relatório (inline — AP-0200).
  var gerarResumoDirecaoHtml = function (
    inicioMs,
    fimMs,
    mrrAtual,
    contagemAtual,
    contagemAnterior,
    urlPreview,
  ) {
    var fmtBRL = function (v) {
      var neg = v < 0
      var s = Math.abs(Math.round(v * 100) / 100)
        .toFixed(2)
        .replace('.', ',')
      var inteiro = s.split(',')[0]
      var mil = ''
      while (inteiro.length > 3) {
        mil = '.' + inteiro.slice(inteiro.length - 3) + mil
        inteiro = inteiro.slice(0, inteiro.length - 3)
      }
      return (neg ? '-' : '') + 'R$ ' + inteiro + mil + ',' + s.split(',')[1]
    }
    var pct = function (a, b) {
      if (a == null || b == null || b === 0) return '—'
      var p = ((a - b) / b) * 100
      return (p >= 0 ? '▲ +' : '▼ ') + p.toFixed(0) + '%'
    }
    var linha = function (rotulo, valor, anterior, unidade) {
      var v = valor == null ? '—' : unidade === 'moeda' ? fmtBRL(valor) : String(valor)
      var va = anterior == null ? '—' : unidade === 'moeda' ? fmtBRL(anterior) : String(anterior)
      return (
        '<tr><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-weight:600;">' +
        rotulo +
        '</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;">' +
        v +
        '</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;color:#6B7280;">' +
        va +
        '</td><td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:right;color:#A8862B;">' +
        pct(valor, anterior) +
        '</td></tr>'
      )
    }
    var dI = new Date(inicioMs).toISOString().slice(0, 10)
    var dF = new Date(fimMs).toISOString().slice(0, 10)
    var html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#0A0A0A;">' +
      '<div style="background:#0A0A0A;padding:20px 24px;border-radius:8px 8px 0 0;">' +
      '<h1 style="color:#E8C766;margin:0;font-size:20px;">CRM Vibratto — Resumo da Direção</h1>' +
      '<p style="color:#C9A227;margin:4px 0 0;font-size:12px;">Período: ' +
      dI +
      ' a ' +
      dF +
      '</p>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px;background:#FFFFFF;border:1px solid #E5E7EB;">' +
      '<tr style="background:#F7F5F1;"><th style="text-align:left;padding:8px 12px;">Indicador</th><th style="text-align:right;padding:8px 12px;">Período</th><th style="text-align:right;padding:8px 12px;">Anterior</th><th style="text-align:right;padding:8px 12px;">Δ</th></tr>' +
      linha('MRR contratado', mrrAtual, null, 'moeda') +
      linha(
        'Novos negócios',
        contagemAtual.novos_negocios,
        contagemAnterior.novos_negocios,
        'numero',
      ) +
      linha('Receita nova', contagemAtual.receita_nova, contagemAnterior.receita_nova, 'moeda') +
      linha(
        'Propostas em aberto',
        contagemAtual.propostas_abertas,
        contagemAnterior.propostas_abertas,
        'numero',
      ) +
      linha(
        'Propostas paradas (&gt;10d)',
        contagemAtual.propostas_paradas,
        contagemAnterior.propostas_paradas,
        'numero',
      ) +
      linha(
        'Tarefas vencidas',
        contagemAtual.tarefas_vencidas,
        contagemAnterior.tarefas_vencidas,
        'numero',
      ) +
      linha(
        'Negócios parados',
        contagemAtual.negocios_parados,
        contagemAnterior.negocios_parados,
        'numero',
      ) +
      '</table>' +
      '<p style="font-size:12px;color:#6B7280;margin-top:12px;">Números agregados do CRM — sem dados pessoais. Abra o painel completo: <a href="' +
      urlPreview +
      '" style="color:#A8862B;">CRM Vibratto</a></p>' +
      '<p style="font-size:11px;color:#9CA3AF;margin-top:4px;">E-mail automático do CRM Vibratto. Se você não deveria recebê-lo, avise a direção.</p>' +
      '</div>'
    return html
  }
  var html = gerarResumoDirecaoHtml(
    inicio,
    fim,
    mrrDeTodos,
    atual,
    anterior,
    'https://tela-de-login-crm-a400a--preview.goskip.app/painel-direcao',
  )
  var assunto =
    'CRM Vibratto — Resumo da Direção (' +
    new Date(inicio).toISOString().slice(0, 10) +
    ' a ' +
    new Date(fim).toISOString().slice(0, 10) +
    ')'
  var mailer = null
  try {
    mailer = $app.newMailClient()
  } catch (errMail) {
    $app.logger().error('T319 cron mail client indisponivel', 'error', String(errMail))
  }
  var agendados = []
  try {
    agendados = $app.findRecordsByFilter('relatorios_agendados', 'ativo = true', '', 100, 0)
  } catch (_) {}
  for (var a = 0; a < agendados.length; a++) {
    var rec = agendados[a]
    var per = String(rec.get('periodicidade') || '')
    var horaAlvo = Number(rec.get('hora_utc') || 0)
    if (per === 'semanal') {
      if (Number(rec.get('dia_semana') || 0) !== diaSemanaUtc) continue
      if (horaAlvo !== horaUtc) continue
    } else {
      if (diaMesUtc !== 1) continue
      if (horaAlvo !== horaUtc) continue
    }
    // idempotência: não reenviar na mesma hora
    var ult = String(rec.get('ultimo_envio_em') || '')
    if (ult) {
      var msUlt = Date.parse(ult.replace(' ', 'T'))
      if (!isNaN(msUlt) && Date.now() - msUlt < 55 * 60 * 1000) continue
    }
    var destinatarios = String(rec.get('destinatarios') || '').split(',')
    var enviados = 0
    var falhas = 0
    if (mailer) {
      for (var d = 0; d < destinatarios.length; d++) {
        var para = destinatarios[d].trim()
        if (!para) continue
        try {
          var msg = new MailerMessage({
            from: {
              address: $app.settings().meta.senderAddress,
              name: $app.settings().meta.senderName,
            },
            to: [{ address: para }],
            subject: assunto,
            html: html,
          })
          mailer.send(msg)
          enviados++
        } catch (errSend) {
          falhas++
          $app.logger().error('T319 cron falha envio', 'para', para, 'error', String(errSend))
        }
      }
    } else {
      falhas = destinatarios.filter(function (x) {
        return x.trim()
      }).length
    }
    rec.set('ultimo_envio_em', new Date().toISOString().replace('T', ' ').substring(0, 19))
    rec.set('ultimo_status', enviados > 0 ? 'enviado' : 'falhou')
    try {
      $app.save(rec)
    } catch (errS) {
      $app.logger().error('T319 cron falha status', 'error', String(errS))
    }
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'relatorios_agendados')
      ev.set('registro_id', rec.id)
      ev.set('acao', 'relatorio_enviado')
      ev.set('ator_id', rec.get('criado_por') || '')
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', '')
      ev.set(
        'estado_posterior',
        JSON.stringify({ origem: 'cron', enviados: enviados, falhas: falhas }),
      )
      $app.save(ev)
    } catch (errA) {
      $app.logger().error('T319 cron auditoria falhou', 'error', String(errA))
    }
  }
})
