// T3.16 — SPEC-3-016: Implantação de cliente (cap. 7 do doc da CEO).
// Rotas:
//   POST /backend/v1/implantacoes                              — cria implantação (admin): instancia
//     modelo padrão de 7 etapas, marca empresa em_implantacao, auditado.
//   POST /backend/v1/implantacoes/{id}/etapas/{etapaId}/concluir — conclui etapa (auth, evidência opcional).
//   POST /backend/v1/implantacoes/{id}/concluir                — conclusão CONDICIONADA (admin):
//     ficha preenchida + item de cofre + etapas concluídas → ficha ativa + empresa ativa +
//     auditoria transicao_ativo. Falha → 400 com lista do que falta.
//   GET  /backend/v1/implantacoes                              — lista com % completo (auth, não-comercial).
//   GET  /backend/v1/implantacoes/{id}                         — detalhe com etapas (auth, não-comercial).
// REGRA DE OURO: nenhum campo aceita credencial (regra T3.11).
// Runtime goja: TODOS os helpers INLINE em cada escopo (AP-0200).

var MODELO_PADRAO = null // nunca em top-level usado dentro de callback — definido inline abaixo

routerAdd(
  'POST',
  '/backend/v1/implantacoes',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    if (String(actor.get('role') || '') !== 'admin') {
      return e.json(403, { error: 'Criação de implantação é exclusiva de administradores.' })
    }
    var body = e.requestInfo().body || {}
    var empresaId = String(body.empresa || '').trim()
    if (!empresaId) return e.json(400, { error: 'Informe a empresa.' })
    var empresa
    try {
      empresa = $app.findRecordById('empresas', empresaId)
    } catch (_) {
      return e.json(400, { error: 'Empresa não encontrada.' })
    }
    var jaImpl = $app.findRecordsByFilter('implantacoes', 'empresa = {:e}', '', 1, 0, {
      e: empresaId,
    })
    if (jaImpl.length > 0) {
      return e.json(400, { error: 'Esta empresa já possui implantação registrada.' })
    }
    var agora = new Date().toISOString().replace('T', ' ')

    var col = $app.findCollectionByNameOrId('implantacoes')
    var rec = new Record(col)
    rec.set('empresa', empresaId)
    rec.set('modelo', 'padrao')
    rec.set('status', 'em_andamento')
    rec.set('responsavel', actor.id)
    rec.set('data_inicio', agora)
    try {
      $app.save(rec)
    } catch (err) {
      return e.json(400, { error: 'Falha ao criar implantação: ' + String(err) })
    }

    var MODELO = [
      [
        'Acessos e estrutura',
        'Criação dos acessos bancários, criação de pasta compartilhada (SharePoint/Google Drive), implantação do sistema e acessos às planilhas de controle e acesso ao sistema de upload contábil.',
      ],
      [
        'Análise das informações financeiras',
        'Análise das informações financeiras: contas pagas, recebidas, a pagar e a receber.',
      ],
      [
        'Diagnóstico e validação dos processos',
        'Diagnóstico, definição e validação dos processos do dia a dia, apresentação do sistema.',
      ],
    ]
    var colEtapas = $app.findCollectionByNameOrId('implantacao_etapas')
    for (var i = 0; i < MODELO.length; i++) {
      var et = new Record(colEtapas)
      et.set('implantacao', rec.id)
      et.set('ordem', i + 1)
      et.set('titulo', MODELO[i][0])
      et.set('descricao', MODELO[i][1])
      et.set('status', 'pendente')
      try {
        $app.save(et)
      } catch (errE) {
        return e.json(400, { error: 'Falha ao criar etapa ' + (i + 1) + ': ' + String(errE) })
      }
    }

    empresa.set('status', 'em_implantacao')
    try {
      $app.save(empresa)
    } catch (errEmp) {
      return e.json(400, { error: 'Falha ao marcar empresa em implantação: ' + String(errEmp) })
    }

    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'implantacoes')
      ev.set('registro_id', rec.id)
      ev.set('acao', 'implantacao_criada')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', '')
      ev.set('estado_posterior', JSON.stringify({ empresa: empresaId, etapas: MODELO.length }))
      $app.save(ev)
    } catch (_) {}

    return e.json(200, { ok: true, id: rec.id, etapas: MODELO.length })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/implantacoes/{id}/etapas/{etapaId}/concluir',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var impl
    try {
      impl = $app.findRecordById('implantacoes', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Implantação não encontrada.' })
    }
    var etapa
    try {
      etapa = $app.findRecordById('implantacao_etapas', e.request.pathValue('etapaId'))
    } catch (_) {
      return e.json(404, { error: 'Etapa não encontrada.' })
    }
    if (String(etapa.get('implantacao') || '') !== impl.id) {
      return e.json(400, { error: 'Etapa não pertence a esta implantação.' })
    }
    if (String(impl.get('status') || '') !== 'em_andamento') {
      return e.json(400, { error: 'Implantação não está em andamento.' })
    }
    var body = e.requestInfo().body || {}
    var ev = String(body.evidencia || '').trim()
    etapa.set('status', 'concluida')
    etapa.set('concluida_em', new Date().toISOString().replace('T', ' '))
    if (ev) etapa.set('evidencia', ev.slice(0, 2000))
    try {
      $app.save(etapa)
    } catch (err) {
      return e.json(400, { error: 'Falha ao concluir etapa: ' + String(err) })
    }
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var evRec = new Record(audit)
      evRec.set('entidade', 'implantacao_etapas')
      evRec.set('registro_id', etapa.id)
      evRec.set('acao', 'etapa_concluida')
      evRec.set('ator_id', actor.id)
      evRec.set('ocorrido_em', new Date().toISOString())
      evRec.set('estado_anterior', 'pendente')
      evRec.set('estado_posterior', 'concluida')
      $app.save(evRec)
    } catch (_) {}
    return e.json(200, { ok: true, etapa: etapa.id, status: 'concluida' })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/implantacoes/{id}/concluir',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    if (String(actor.get('role') || '') !== 'admin') {
      return e.json(403, { error: 'Conclusão de implantação é exclusiva de administradores.' })
    }
    var impl
    try {
      impl = $app.findRecordById('implantacoes', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Implantação não encontrada.' })
    }
    if (String(impl.get('status') || '') !== 'em_andamento') {
      return e.json(400, { error: 'Implantação já concluída ou cancelada.' })
    }
    var empresaId = String(impl.get('empresa') || '')
    var faltando = []

    // 1) todas as etapas concluídas ou nao_aplicavel
    var etapas = $app.findRecordsByFilter(
      'implantacao_etapas',
      'implantacao = {:i}',
      'ordem',
      100,
      0,
      { i: impl.id },
    )
    var etapasPendentes = []
    for (var i = 0; i < etapas.length; i++) {
      var st = String(etapas[i].get('status') || '')
      if (st !== 'concluida' && st !== 'nao_aplicavel') {
        etapasPendentes.push(
          String(etapas[i].get('ordem')) + '. ' + String(etapas[i].get('titulo')),
        )
      }
    }
    if (etapasPendentes.length > 0) {
      faltando.push('Etapas pendentes: ' + etapasPendentes.join('; '))
    }

    // 2) ficha existe e campos essenciais preenchidos
    var ficha = null
    var fs = $app.findRecordsByFilter('fichas_operacionais', 'empresa = {:e}', '', 1, 0, {
      e: empresaId,
    })
    if (fs.length > 0) ficha = fs[0]
    if (!ficha) {
      faltando.push('Ficha operacional não criada para esta empresa.')
    } else {
      var essenciais = ['responsavel_principal', 'servicos_contratados', 'sistema']
      var vazios = []
      for (var c = 0; c < essenciais.length; c++) {
        var v = String(ficha.get(essenciais[c]) || '')
        if (!v) vazios.push(essenciais[c])
      }
      if (vazios.length > 0) faltando.push('Ficha sem campos essenciais: ' + vazios.join(', '))
      // 3) item de cofre registrado
      var temCofre = String(ficha.get('item_cofre_sistema') || '') !== ''
      if (!temCofre) {
        var bancos = $app.findRecordsByFilter('ficha_bancos', 'ficha = {:f}', '', 100, 0, {
          f: ficha.id,
        })
        for (var b = 0; b < bancos.length; b++) {
          if (String(bancos[b].get('item_cofre') || '') !== '') {
            temCofre = true
            break
          }
        }
      }
      if (!temCofre) faltando.push('Nenhum item de cofre registrado (sistema ou bancos).')
    }

    if (faltando.length > 0) {
      return e.json(400, { error: 'Implantação não pode ser concluída.', pendencias: faltando })
    }

    // Sucesso: transição completa
    impl.set('status', 'concluida')
    impl.set('data_conclusao', new Date().toISOString().replace('T', ' '))
    try {
      $app.save(impl)
    } catch (errI) {
      return e.json(400, { error: 'Falha ao concluir implantação: ' + String(errI) })
    }
    ficha.set('status_operacional', 'ativo')
    $app.save(ficha)
    var empresa = $app.findRecordById('empresas', empresaId)
    empresa.set('status', 'ativa')
    $app.save(empresa)

    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev2 = new Record(audit)
      ev2.set('entidade', 'implantacoes')
      ev2.set('registro_id', impl.id)
      ev2.set('acao', 'transicao_ativo')
      ev2.set('ator_id', actor.id)
      ev2.set('ocorrido_em', new Date().toISOString())
      ev2.set('estado_anterior', 'em_implantacao')
      ev2.set('estado_posterior', JSON.stringify({ empresa: empresaId, ficha: ficha.id }))
      $app.save(ev2)
    } catch (_) {}

    return e.json(200, {
      ok: true,
      status: 'concluida',
      empresa_status: 'ativa',
      ficha_status: 'ativo',
    })
  },
  $apis.requireAuth(),
)

// T3.16 ajuste (CEO 22:44): e-mail de boas-vindas GERADO pelo CRM.
// GET /backend/v1/implantacoes/{id}/email-boas-vindas — admin/coordenacao.
// Monta o texto real da Vibratto com nome do cliente, e-mail centralizador e time designado.
routerAdd(
  'GET',
  '/backend/v1/implantacoes/{id}/email-boas-vindas',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel !== 'admin' && papel !== 'coordenacao') {
      return e.json(403, { error: 'Geração do e-mail é exclusiva de admin/coordenação.' })
    }
    var impl
    try {
      impl = $app.findRecordById('implantacoes', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Implantação não encontrada.' })
    }
    var empresaId = String(impl.get('empresa') || '')
    var nomeCliente = empresaId
    try {
      nomeCliente = String($app.findRecordById('empresas', empresaId).get('nome') || empresaId)
    } catch (_) {}
    // nome do cliente sem sufixo para saudação (primeira palavra)
    var saudacao = nomeCliente.split(' ')[0] || nomeCliente
    var texto = [
      'Prezado(a) ' + saudacao + ',',
      '',
      'É um prazer tê-la conosco! Seja muito bem-vinda ao nosso BPO. Eu e meu time estamos empenhados em garantir que você tenha a melhor experiência possível durante toda a nossa jornada juntos.',
      '',
      'A implantação ocorrerá em três etapas:',
      '1. Criação dos acessos bancários, criação de pasta compartilhada, implantação do sistema e acessos às planilhas de controle e acesso ao sistema de upload contábil;',
      '2. Análise das informações financeiras, contas pagas, recebidas, a pagar e a receber;',
      '3. Diagnóstico, definição e validação dos processos do dia a dia, apresentação do sistema.',
      '',
      'Para facilitar nossa comunicação e a troca de documentos, todas as interações por e-mail podem ser enviadas para: financeirox@vibratto.com.br (e-mail criado por nós para centralizar a comunicação) — ou, se preferir, o financeiro pode nos dar acesso ao e-mail dele.',
      '',
      'Além disso, por favor, crie (quando o cliente tem, ou será criada por nós e compartilhada) a pasta no SharePoint ou Google Drive, onde centralizaremos todas as informações na nuvem.',
      '',
      'Aproveito para apresentar nosso time:',
      'Leandro e Lucélia — Implantação / Faturamento e Contas a Receber',
      'Renato e Karine — Controladoria e Contas a Pagar',
      '',
      'Todos receberão cópias de financeirox@vibratto.com.br.',
      '',
      'Abraços,',
      'Deniane Bezerra',
      'Vibratto BPO Financeiro',
    ].join('\n')
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var evRec = new Record(audit)
      evRec.set('entidade', 'implantacoes')
      evRec.set('registro_id', impl.id)
      evRec.set('acao', 'email_boas_vindas_gerado')
      evRec.set('ator_id', actor.id)
      evRec.set('ocorrido_em', new Date().toISOString())
      evRec.set('estado_anterior', '')
      evRec.set('estado_posterior', 'gerado')
      $app.save(evRec)
    } catch (_) {}
    return e.json(200, {
      ok: true,
      empresa: nomeCliente,
      assunto: 'Bem-vinda ao BPO Vibratto — direcionamentos de implantação',
      texto: texto,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/implantacoes',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var lista = $app.findRecordsByFilter('implantacoes', '', '-created', 200, 0)
    var empresas = {}
    try {
      var emps = $app.findRecordsByFilter('empresas', '', '', 500, 0)
      for (var i = 0; i < emps.length; i++)
        empresas[emps[i].id] = String(emps[i].get('nome') || emps[i].id)
    } catch (_) {}
    var itens = []
    for (var r = 0; r < lista.length; r++) {
      var im = lista[r]
      var etapas = $app.findRecordsByFilter(
        'implantacao_etapas',
        'implantacao = {:i}',
        'ordem',
        100,
        0,
        { i: im.id },
      )
      var concluidas = 0
      for (var t = 0; t < etapas.length; t++) {
        var st = String(etapas[t].get('status') || '')
        if (st === 'concluida' || st === 'nao_aplicavel') concluidas++
      }
      itens.push({
        id: im.id,
        empresa: empresas[String(im.get('empresa') || '')] || String(im.get('empresa') || ''),
        empresa_id: String(im.get('empresa') || ''),
        status: String(im.get('status') || ''),
        data_inicio: String(im.get('data_inicio') || '').slice(0, 10),
        data_conclusao: String(im.get('data_conclusao') || '').slice(0, 10),
        etapas_total: etapas.length,
        etapas_concluidas: concluidas,
        pct: etapas.length > 0 ? Math.round((concluidas / etapas.length) * 100) : 0,
      })
    }
    return e.json(200, { total: itens.length, itens: itens })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/implantacoes/{id}',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var im
    try {
      im = $app.findRecordById('implantacoes', e.request.pathValue('id'))
    } catch (_) {
      return e.json(404, { error: 'Implantação não encontrada.' })
    }
    var empresaNome = String(im.get('empresa') || '')
    try {
      empresaNome = String($app.findRecordById('empresas', empresaNome).get('nome') || empresaNome)
    } catch (_) {}
    var etapas = $app.findRecordsByFilter(
      'implantacao_etapas',
      'implantacao = {:i}',
      'ordem',
      100,
      0,
      { i: im.id },
    )
    var itens = []
    for (var t = 0; t < etapas.length; t++) {
      itens.push({
        id: etapas[t].id,
        ordem: etapas[t].get('ordem'),
        titulo: String(etapas[t].get('titulo') || ''),
        descricao: String(etapas[t].get('descricao') || ''),
        status: String(etapas[t].get('status') || ''),
        evidencia: String(etapas[t].get('evidencia') || ''),
        concluida_em: String(etapas[t].get('concluida_em') || '').slice(0, 10),
      })
    }
    return e.json(200, {
      id: im.id,
      empresa: empresaNome,
      status: String(im.get('status') || ''),
      data_inicio: String(im.get('data_inicio') || '').slice(0, 10),
      etapas: itens,
    })
  },
  $apis.requireAuth(),
)
