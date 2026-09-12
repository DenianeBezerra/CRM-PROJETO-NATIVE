// T3.02b — ficha de preparação da proposta: endpoint de consolidação.
// GET /backend/v1/fichas/{negocioId} (auth) — consolida em uma leitura:
// oportunidade, qualificação, diagnóstico atual, formulário respondido e
// ficha editável mais recente. Indicador de completude explícito.
// Runtime goja: lógica inline; finders em try/catch; JSON.parse(String(raw)).
routerAdd(
  'GET',
  '/backend/v1/fichas/{negocioId}',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var negocioId = e.request.pathValue('negocioId')
    var negocio
    try {
      negocio = $app.findRecordById('negocios', negocioId)
    } catch (_) {
      return e.json(404, { error: 'Oportunidade não encontrada.' })
    }

    // ---- Oportunidade (dados comerciais + contexto do formulário) ----
    var contatoNome = ''
    var contatoEmail = ''
    var contatoTelefone = ''
    var contatoCidade = ''
    try {
      var c = $app.findRecordById('clientes', String(negocio.get('cliente') || ''))
      contatoNome = String(c.get('nome') || '')
      contatoEmail = String(c.get('email') || '')
      contatoTelefone = String(c.get('telefone') || '')
      contatoCidade = String(c.get('cidade') || '')
    } catch (_) {}
    var empresaNome = ''
    try {
      empresaNome = String(
        $app.findRecordById('empresas', String(negocio.get('empresa') || '')).get('nome') || '',
      )
    } catch (_) {}

    var dadosForm = {}
    try {
      dadosForm = JSON.parse(String(negocio.get('dados_formulario') || '{}'))
    } catch (_) {
      dadosForm = {}
    }
    if (typeof dadosForm !== 'object' || dadosForm === null) dadosForm = {}

    var oportunidade = {
      titulo: String(negocio.get('titulo') || ''),
      contato: contatoNome,
      contato_email: contatoEmail,
      contato_telefone: contatoTelefone,
      contato_cidade: contatoCidade,
      empresa: empresaNome,
      valor: negocio.get('valor'),
      servico: String(negocio.get('servico') || ''),
      estagio: String(negocio.get('estagio') || ''),
      status: String(negocio.get('status') || ''),
      prioridade: String(negocio.get('prioridade') || ''),
      score: negocio.get('score'),
      proxima_acao_descricao: String(negocio.get('proxima_acao_descricao') || ''),
      proxima_acao_em: String(negocio.get('proxima_acao_em') || ''),
      canal: String(negocio.get('canal') || ''),
      origem_especifica: String(negocio.get('origem_especifica') || ''),
      formulario_status: String(negocio.get('formulario_status') || ''),
      formulario_resumo: String(negocio.get('formulario_resumo') || ''),
      dados_formulario: dadosForm,
    }

    // ---- Qualificação (percentual + respostas legíveis) ----
    var qualPct = null
    var qualRespostas = []
    try {
      var perguntas = $app.findRecordsByFilter(
        'perguntas_qualificacao',
        'ativa = true',
        'ordem',
        100,
        0,
      )
      var resps = $app.findRecordsByFilter(
        'respostas_qualificacao',
        'negocio = {:n}',
        '-created',
        200,
        0,
        { n: negocioId },
      )
      var mapa = {}
      for (var i = 0; i < perguntas.length; i++) {
        mapa[String(perguntas[i].id)] = {
          texto: String(perguntas[i].get('texto') || ''),
          obrigatoria: perguntas[i].get('obrigatoria') === true,
        }
      }
      var respondidas = 0
      var obrigatoriasRespondidas = 0
      var totalObrigatorias = 0
      for (var k in mapa) {
        if (mapa[k].obrigatoria) totalObrigatorias++
      }
      for (var j = 0; j < resps.length; j++) {
        var pid = String(resps[j].get('pergunta') || '')
        var p = mapa[pid]
        var txt = String(resps[j].get('resposta_texto') || '')
        var num = resps[j].get('resposta_numero')
        var bl = resps[j].get('resposta_bool')
        var valor =
          txt !== ''
            ? txt
            : num !== null && num !== undefined && num !== ''
              ? String(num)
              : bl === true
                ? 'Sim'
                : bl === false
                  ? 'Não'
                  : ''
        if (p) {
          qualRespostas.push({ pergunta: p.texto, resposta: valor, obrigatoria: p.obrigatoria })
          respondidas++
          if (p.obrigatoria) obrigatoriasRespondidas++
        }
      }
      if (perguntas.length > 0) {
        qualPct = Math.round((respondidas / perguntas.length) * 100)
      }
    } catch (err) {
      $app.logger().error('T302b qualificação falhou', 'err', String(err))
    }

    // ---- Diagnóstico atual (última versão) ----
    var diag = null
    try {
      var diags = $app.findRecordsByFilter('diagnosticos', 'negocio = {:n}', '-versao', 1, 0, {
        n: negocioId,
      })
      if (diags.length > 0) {
        diag = {
          versao: diags[0].get('versao'),
          resumo: String(diags[0].get('resumo') || ''),
          pontos_de_dor: String(diags[0].get('pontos_de_dor') || ''),
          decisao_envolvida: String(diags[0].get('decisao_envolvida') || ''),
        }
      }
    } catch (_) {}

    // ---- Formulário respondido (resumo + respostas) ----
    var formulario = null
    try {
      var forms = $app.findRecordsByFilter(
        'formularios',
        'negocio = {:n} && status = "respondido"',
        '-respondido_em',
        1,
        0,
        { n: negocioId },
      )
      if (forms.length > 0) {
        var respostas = {}
        try {
          respostas = JSON.parse(String(forms[0].get('respostas') || '{}'))
        } catch (_) {}
        formulario = {
          solucao: String(forms[0].get('solucao') || ''),
          respondido_em: String(forms[0].get('respondido_em') || ''),
          resumo: String(forms[0].get('resumo') || ''),
          respostas: respostas,
        }
      }
    } catch (_) {}

    // ---- Ficha editável (versão mais recente) ----
    var ficha = null
    try {
      var fichas = $app.findRecordsByFilter('fichas_proposta', 'negocio = {:n}', '-versao', 1, 0, {
        n: negocioId,
      })
      if (fichas.length > 0) {
        ficha = {
          id: fichas[0].id,
          versao: fichas[0].get('versao'),
          solucao_recomendada: String(fichas[0].get('solucao_recomendada') || ''),
          escopo_sugerido: String(fichas[0].get('escopo_sugerido') || ''),
          frequencia_atuacao: String(fichas[0].get('frequencia_atuacao') || ''),
          senioridade: String(fichas[0].get('senioridade') || ''),
          entregaveis: String(fichas[0].get('entregaveis') || ''),
          premissas_precificacao: String(fichas[0].get('premissas_precificacao') || ''),
          pontos_a_confirmar: String(fichas[0].get('pontos_a_confirmar') || ''),
          motivo_atualizacao: String(fichas[0].get('motivo_atualizacao') || ''),
        }
      }
    } catch (_) {}

    // ---- Completude explícita (nada escondido) ----
    var faltando = []
    if (qualPct === null || qualPct < 100)
      faltando.push('Qualificação incompleta (' + (qualPct === null ? 0 : qualPct) + '%)')
    if (!diag) faltando.push('Sem diagnóstico registrado')
    if (oportunidade.formulario_status !== 'respondido') faltando.push('Formulário não respondido')
    if (!ficha) faltando.push('Ficha ainda não preenchida pelo time')

    return e.json(200, {
      negocio_id: negocioId,
      oportunidade: oportunidade,
      qualificacao: { percentual: qualPct, respostas: qualRespostas },
      diagnostico: diag,
      formulario: formulario,
      ficha: ficha,
      completude: { pronto_para_proposta: faltando.length === 0, faltando: faltando },
    })
  },
  $apis.requireAuth(),
)
