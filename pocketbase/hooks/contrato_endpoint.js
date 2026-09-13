// T3.17 — SPEC-3-017: endpoints do contrato no CRM.
// GET  /backend/v1/contratos/{negocioId}            (auth admin|coordenacao) — consolidação
// POST /backend/v1/negocios/{id}/contrato/gerar     (auth admin|coordenacao) — gera nova versão
// GET  /backend/v1/contratos/{negocioId}/versao/{v} (auth admin|coordenacao) — texto integral
// Regras: contrato só nasce de negócio GANHO; dados mínimos (razao_social, cnpj,
// representantes) informados na geração; versionamento incremental (nenhuma versão é
// sobrescrita); auditoria contrato_gerado; operator 403.
// Runtime goja: TODA lógica inline nos callbacks (AP-0200 — helpers top-level não são
// visíveis dentro de funções inline); finders em try/catch; JSON.parse(String(raw)).

routerAdd(
  'GET',
  '/backend/v1/contratos/{negocioId}',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel !== 'admin' && papel !== 'coordenacao') {
      return e.json(403, { error: 'Consulta do contrato é exclusiva de admin/coordenação.' })
    }
    var negocioId = e.request.pathValue('negocioId')
    var negocio
    try {
      negocio = $app.findRecordById('negocios', negocioId)
    } catch (_) {
      return e.json(404, { error: 'Oportunidade não encontrada.' })
    }

    // ---- dados que o CRM já tem ----
    var empresaNome = ''
    var empresaCnpj = ''
    var empresaId = ''
    try {
      var cli = $app.findRecordById('clientes', String(negocio.get('cliente') || ''))
      empresaId = String(cli.get('empresa') || '')
      if (empresaId) {
        var emp = $app.findRecordById('empresas', empresaId)
        empresaNome = String(emp.get('nome') || '')
        empresaCnpj = String(emp.get('cnpj') || '')
      }
    } catch (_) {}

    var valor = negocio.get('valor')
    var recorrencia = String(negocio.get('recorrencia') || '')
    var servico = String(negocio.get('servico') || '')
    var dataGanho = String(negocio.get('data_ganho') || '')

    // ---- versões existentes ----
    var versoes = []
    try {
      var recs = $app.findRecordsByFilter('contratos', 'negocio = {:n}', '-versao', 100, 0, {
        n: negocioId,
      })
      for (var i = 0; i < recs.length; i++) {
        versoes.push({
          versao: recs[i].get('versao'),
          status: String(recs[i].get('status') || ''),
          gerado_em: String(recs[i].get('gerado_em') || ''),
          gerado_por: String(recs[i].get('gerado_por') || ''),
        })
      }
    } catch (err) {
      $app.logger().error('T317 listagem de versões falhou', 'err', String(err))
    }

    // ---- completude: o que falta para gerar ----
    var faltando = []
    if (String(negocio.get('estagio') || '') !== 'fechado_ganho')
      faltando.push('Oportunidade não está fechada como ganho')
    if (!empresaNome) faltando.push('Empresa não vinculada à oportunidade')
    if (!empresaCnpj) faltando.push('CNPJ da empresa não cadastrado')

    var ultimaVersao = versoes.length > 0 ? versoes[0].versao : 0

    return e.json(200, {
      negocio_id: negocioId,
      negocio: {
        titulo: String(negocio.get('titulo') || ''),
        valor: valor,
        recorrencia: recorrencia,
        servico: servico,
        data_ganho: dataGanho,
        estagio: String(negocio.get('estagio') || ''),
      },
      empresa: { id: empresaId, nome: empresaNome, cnpj: empresaCnpj },
      versoes: versoes,
      ultima_versao: ultimaVersao,
      completude: { pronto_para_gerar: faltando.length === 0, faltando: faltando },
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/negocios/{id}/contrato/gerar',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel !== 'admin' && papel !== 'coordenacao') {
      return e.json(403, { error: 'Geração de contrato é exclusiva de admin/coordenação.' })
    }
    var negocioId = e.request.pathValue('id')
    var negocio
    try {
      negocio = $app.findRecordById('negocios', negocioId)
    } catch (_) {
      return e.json(404, { error: 'Oportunidade não encontrada.' })
    }
    if (String(negocio.get('estagio') || '') !== 'fechado_ganho') {
      return e.json(400, {
        error: 'Contrato só pode ser gerado para oportunidade fechada como ganho.',
      })
    }

    var body = e.requestInfo().body || {}
    var razaoSocial = String(body.razao_social || '').trim()
    var cnpj = String(body.cnpj || '').trim()
    var sede = String(body.sede || '').trim()
    var repContratante = String(body.representante_contratante || '').trim()
    var repPrestador = String(body.representante_prestador || 'Deniane Bezerra').trim()
    var escopo = String(body.escopo_servicos || '').trim()
    var condicoes = String(body.condicoes_financeiras || '').trim()
    var foro = String(body.foro || 'São Paulo/SP').trim()
    var vigencia = String(body.vigencia_inicio || '').trim()
    var indice = String(body.indice_reajuste || 'IPCA').trim()

    var faltando = []
    if (!razaoSocial) faltando.push('Razão social da contratante')
    if (!cnpj) faltando.push('CNPJ da contratante')
    if (!repContratante) faltando.push('Representante legal da contratante')
    if (!escopo) faltando.push('Escopo dos serviços (itens 1.1)')
    if (!condicoes) faltando.push('Condições financeiras (itens 5.1)')
    if (faltando.length > 0) {
      return e.json(400, { error: 'Dados mínimos ausentes.', faltando: faltando })
    }

    // valor/recorrência vêm do negócio (fonte única) — nunca do corpo da requisição
    var valor = negocio.get('valor')
    var recorrencia = String(negocio.get('recorrencia') || 'mensal')
    var servico = String(negocio.get('servico') || '')

    var dados = {
      razao_social_contratante: razaoSocial,
      cnpj_contratante: cnpj,
      sede_contratante: sede,
      representante_contratante: repContratante,
      representante_prestador: repPrestador,
      escopo_servicos: escopo,
      condicoes_financeiras: condicoes,
      foro: foro,
      vigencia_inicio: vigencia,
      indice_reajuste: indice,
      negocio_valor: valor,
      negocio_recorrencia: recorrencia,
      negocio_servico: servico,
    }

    var prestadora = 'VIBRATTO ASSESSORIA EMPRESARIAL LTDA'
    var prestadoraCnpj = ''
    var prestadoraSede = ''
    try {
      var cfgs = $app.findRecordsByFilter(
        'configuracoes_operacionais',
        "chave = 'dados_prestadora'",
        '',
        1,
        0,
      )
      if (cfgs.length > 0) {
        var cfgDados = {}
        try {
          cfgDados = JSON.parse(String(cfgs[0].get('valor') || '{}'))
        } catch (_) {}
        prestadora = String(cfgDados.razao_social || prestadora)
        prestadoraCnpj = String(cfgDados.cnpj || '')
        prestadoraSede = String(cfgDados.sede || '')
      }
    } catch (_) {}

    var texto = String(TEMPLATE_CONTRATO_VIBRATTO)
    var pares = [
      ['{{RAZAO_SOCIAL_PRESTADOR}}', prestadora],
      ['{{CNPJ_PRESTADOR}}', prestadoraCnpj || '_______________________'],
      ['{{SEDE_PRESTADOR}}', prestadoraSede || '_______________________'],
      ['{{REP_PRESTADOR}}', repPrestador],
      ['{{RAZAO_SOCIAL_CONTRATANTE}}', razaoSocial],
      ['{{CNPJ_CONTRATANTE}}', cnpj],
      ['{{SEDE_CONTRATANTE}}', sede || '_______________________'],
      ['{{REP_CONTRATANTE}}', repContratante],
      ['{{ESCOPO_SERVICOS}}', escopo],
      ['{{CONDICOES_FINANCEIRAS}}', condicoes],
      ['{{REAJUSTE_INDICE}}', indice],
      ['{{VIGENCIA_INICIO}}', vigencia || '___/___/______'],
      ['{{FORO}}', foro],
      ['{{DATA_ASSINATURA}}', '___/___/______'],
    ]
    for (var k = 0; k < pares.length; k++) {
      while (texto.indexOf(pares[k][0]) >= 0) {
        texto = texto.replace(pares[k][0], pares[k][1])
      }
    }

    // versão = última + 1 (nenhuma sobrescrita)
    var ultima = 0
    try {
      var anteriores = $app.findRecordsByFilter('contratos', 'negocio = {:n}', '-versao', 1, 0, {
        n: negocioId,
      })
      if (anteriores.length > 0) ultima = Number(anteriores[0].get('versao')) || 0
    } catch (_) {}

    var col = $app.findCollectionByNameOrId('contratos')
    var rec = new Record(col)
    rec.set('negocio', negocioId)
    rec.set('versao', ultima + 1)
    rec.set('status', 'gerado')
    rec.set('conteudo', texto)
    rec.set('dados', JSON.stringify(dados))
    rec.set('gerado_por', actor.id)
    rec.set('gerado_em', new Date().toISOString())
    try {
      $app.save(rec)
    } catch (err) {
      $app.logger().error('T317 falha ao salvar contrato', 'err', String(err))
      return e.json(400, { error: 'Falha ao salvar o contrato: ' + String(err) })
    }

    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'contratos')
      ev.set('registro_id', rec.id)
      ev.set('acao', 'contrato_gerado')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', '')
      ev.set('estado_posterior', JSON.stringify({ negocio: negocioId, versao: ultima + 1 }))
      $app.save(ev)
    } catch (_) {}

    return e.json(200, {
      ok: true,
      id: rec.id,
      versao: ultima + 1,
      status: 'gerado',
      conteudo: texto,
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/contratos/{negocioId}/versao/{versao}',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel !== 'admin' && papel !== 'coordenacao') {
      return e.json(403, { error: 'Consulta do contrato é exclusiva de admin/coordenação.' })
    }
    var negocioId = e.request.pathValue('negocioId')
    var v = Number(e.request.pathValue('versao'))
    if (!Number.isFinite(v) || v < 1) {
      return e.json(400, { error: 'Versão inválida.' })
    }
    var recs = []
    try {
      recs = $app.findRecordsByFilter('contratos', 'negocio = {:n} && versao = {:v}', '', 1, 0, {
        n: negocioId,
        v: v,
      })
    } catch (_) {}
    if (recs.length === 0) {
      return e.json(404, { error: 'Versão do contrato não encontrada.' })
    }
    var dados = {}
    try {
      dados = JSON.parse(String(recs[0].get('dados') || '{}'))
    } catch (_) {}
    return e.json(200, {
      negocio_id: negocioId,
      versao: recs[0].get('versao'),
      status: String(recs[0].get('status') || ''),
      gerado_em: String(recs[0].get('gerado_em') || ''),
      dados: dados,
      conteudo: String(recs[0].get('conteudo') || ''),
    })
  },
  $apis.requireAuth(),
)
