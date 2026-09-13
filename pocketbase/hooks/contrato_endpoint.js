// T3.17 — SPEC-3-017: endpoints do contrato gerado a partir do negócio ganho.
// - GET  /backend/v1/contratos/{negocioId}          (auth admin|coordenacao) — consolidação
//   dos dados que o CRM já tem + versões existentes + completude (o que falta para gerar).
// - POST /backend/v1/negocios/{id}/contrato/gerar   (auth admin|coordenacao) — gera nova
//   versão: exige estagio fechado_ganho + dados mínimos (razao_social, cnpj, representantes).
// - GET  /backend/v1/contratos/{negocioId}/versao/{versao} — texto integral da versão.
// Runtime goja: TODA lógica inline dentro dos callbacks (AP-0200 — helpers top-level
// derrubam o hook); finders em try/catch; JSON.parse(String(raw)).
// IMPORTANTE: o template vive INLINE neste arquivo — variáveis top-level de OUTRO arquivo
// de hook NÃO são visíveis no runtime goja (cada arquivo tem escopo próprio; lição
// AP-0200 estendida na T3.17: contrato_modelo.js não é enxergado por contrato_endpoint.js).
// Fluxo real da CEO (13/09 23:23): proposta aprovada → contrato → restante do fluxo.
// Proposta não aprovada → identificar a objeção (motivo estruturado já coberto pela T2.24).

var TEMPLATE_CONTRATO_VIBRATTO = [
  'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE BPO FINANCEIRO, CONTROLADORIA E GESTÃO FINANCEIRA',
  '',
  '{{RAZAO_SOCIAL_PRESTADOR}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{CNPJ_PRESTADOR}}, com sede em {{SEDE_PRESTADOR}}, neste ato representada por {{REP_PRESTADOR}}, doravante denominada PRESTADORA, e, de outro lado, {{RAZAO_SOCIAL_CONTRATANTE}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{CNPJ_CONTRATANTE}}, com sede em {{SEDE_CONTRATANTE}}, neste ato representada por {{REP_CONTRATANTE}}, doravante denominada CONTRATANTE.',
  '',
  'As partes têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.',
  '',
  'CLÁUSULA 1ª — DO OBJETO',
  '',
  '1.1. O presente contrato tem como objeto a prestação, pela PRESTADORA, dos seguintes serviços:',
  '',
  '{{ESCOPO_SERVICOS}}',
  '',
  '1.2. A prestação dos serviços inclui a implantação das rotinas objeto deste contrato, compreendendo a criação dos acessos e da estrutura operacional, a análise das informações financeiras da CONTRATANTE e o diagnóstico, definição e validação dos processos do dia a dia, com apresentação do sistema de gestão.',
  '',
  '1.3. A prestadora realizará diagnóstico tributário preliminar das operações da CONTRATANTE, sem emissão de parecer contábil, fiscal ou jurídico — eventuais conclusões desse diagnóstico serão sempre validadas com o profissional responsável da CONTRATANTE.',
  '',
  '1.4. A execução de pagamentos, transferências e movimentações bancárias em nome da CONTRATANTE dependerá de alçada expressamente autorizada por ela, registrada por escrito (e-mail ou sistema), com limites definidos pelas partes.',
  '',
  '1.5. Os serviços serão prestados de forma remota e/ou presencial, conforme a necessidade de cada rotina, sem exclusividade para qualquer das partes.',
  '',
  '1.6. A PRESTADORA não se obriga a resultados de mercado, concessão de crédito ou qualquer resultado econômico futuro — sua obrigação é de meio, com execução diligente das rotinas contratadas.',
  '',
  'CLÁUSULA 2ª — DAS OBRIGAÇÕES DA PRESTADORA',
  '',
  '2.1. Executar as rotinas contratadas conforme os procedimentos operacionais acordados, com rastreabilidade de cada passo registrado.',
  '2.2. Entregar relatórios e leituras de decisão nos prazos acordados, com números fiéis aos registros — sem arredondamento ou apresentação que induza conclusão equivocada.',
  '2.3. Manter sigilo sobre todas as informações da CONTRATANTE, durante e após a vigência, e tratar dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).',
  '2.4. Comunicar prontamente a CONTRATANTE qualquer fato que impeça ou comprometa a execução das rotinas.',
  '',
  'CLÁUSULA 3ª — DAS OBRIGAÇÕES DA CONTRATANTE',
  '',
  '3.1. Fornecer, no prazo acordado, os acessos, documentos e informações necessários à execução dos serviços, inclusive credenciais de sistemas por meio seguro.',
  '3.2. Designar responsável pela validação de rotinas, autorizações e aprovações.',
  '3.3. Efetuar os pagamentos nas datas pactuadas na Cláusula 4ª.',
  '3.4. Manter a contabilidade e as obrigações fiscais com profissional próprio ou contratado, não constituindo objeto deste contrato a substituição dessas funções, salvo disposição expressa em contrário no escopo.',
  '',
  'CLÁUSULA 4ª — DO PRAZO',
  '',
  '4.1. O presente contrato terá vigência de 12 (doze) meses, iniciando-se em {{VIGENCIA_INICIO}}, renovando-se automaticamente por períodos sucessivos de 12 (doze) meses, salvo denúncia de qualquer das partes.',
  '',
  'CLÁUSULA 5ª — DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO',
  '',
  '5.1. Pela execução dos serviços, a CONTRATANTE pagará à PRESTADORA:',
  '',
  '{{CONDICOES_FINANCEIRAS}}',
  '',
  '5.2. Os valores serão reajustados anualmente pelo {{REAJUSTE_INDICE}} ou pelo índice legal que vier a substituí-lo, incidindo a partir da data-base.',
  '5.3. A implantação é cobrada uma única vez, nas parcelas indicadas acima, e não é reajustada nem devolvida em caso de rescisão por culpa da CONTRATANTE.',
  '5.4. Pagamentos em atraso acarretarão multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês e correção monetária, além da faculdade de suspensão dos serviços após aviso prévio de 5 (cinco) dias úteis.',
  '',
  'CLÁUSULA 6ª — DA RESCISÃO',
  '',
  '6.1. Qualquer das partes poderá rescindir este contrato mediante aviso prévio de 30 (trinta) dias, por escrito.',
  '6.2. A rescisão por culpa da CONTRATANTE não exonera o pagamento dos serviços prestados até a data do efetivo desligamento, nem das parcelas de implantação vencidas.',
  '6.3. Rescindido o contrato, a PRESTADORA entregará à CONTRATANTE os documentos, planilhas e registros em seu poder, no prazo de até 15 (quinze) dias.',
  '',
  'CLÁUSULA 7ª — DO SIGILO E DA PROTEÇÃO DE DADOS',
  '',
  '7.1. As partes manterão sigilo sobre todas as informações comerciais, financeiras e cadastrais trocadas na execução deste contrato.',
  '7.2. O tratamento de dados pessoais observará a Lei nº 13.709/2018 (LGPD), limitando-se às finalidades da execução contratual.',
  '',
  'CLÁUSULA 8ª — DAS DISPOSIÇÕES GERAIS',
  '',
  '8.1. Este contrato não gera vínculo empregatício, societário ou de representação entre as partes.',
  '8.2. A PRESTADORA não responde por obrigações tributárias, trabalhistas ou fiscais da CONTRATANTE, cuja titularidade permanece com ela.',
  '8.3. Nenhuma renúncia de direito será presumida; as alterações deste contrato somente valerão por aditivo escrito assinado pelas partes.',
  '',
  'CLÁUSULA 9ª — DO FORO',
  '',
  '9.1. Fica eleito o foro da comarca de {{FORO}} para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.',
  '',
  'E, por estarem justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor.',
  '',
  'São Paulo, {{DATA_ASSINATURA}}.',
  '',
  '',
  '_______________________________________',
  '{{RAZAO_SOCIAL_PRESTADOR}}',
  '',
  '',
  '_______________________________________',
  '{{RAZAO_SOCIAL_CONTRATANTE}}',
].join('\n')

routerAdd(
  'GET',
  '/backend/v1/contratos/{negocioId}',
  (e) => {
    var actor = e.auth
    if (!actor) return e.json(401, { error: 'Autenticação obrigatória.' })
    var papel = String(actor.get('role') || '')
    if (papel !== 'admin' && papel !== 'coordenacao') {
      return e.json(403, { error: 'Leitura do contrato é exclusiva de admin/coordenação.' })
    }
    var negocioId = e.request.pathValue('negocioId')
    var negocio
    try {
      negocio = $app.findRecordById('negocios', negocioId)
    } catch (_) {
      return e.json(404, { error: 'Oportunidade não encontrada.' })
    }

    // ---- Dados que o CRM já tem ----
    var empresaNome = ''
    var empresaCnpj = ''
    var empresaId = String(negocio.get('empresa') || '')
    if (empresaId) {
      try {
        var emp = $app.findRecordById('empresas', empresaId)
        empresaNome = String(emp.get('nome') || '')
        empresaCnpj = String(emp.get('cnpj') || '')
      } catch (_) {}
    }
    if (!empresaNome) {
      try {
        var cli = $app.findRecordById('clientes', String(negocio.get('cliente') || ''))
        if (!empresaNome) empresaNome = String(cli.get('nome') || '')
      } catch (_) {}
    }

    var valor = negocio.get('valor')
    var servico = String(negocio.get('servico') || '')
    var recorrencia = String(negocio.get('recorrencia') || '')
    var dataGanho = String(negocio.get('data_ganho') || '')
    var estagio = String(negocio.get('estagio') || '')

    // ---- Versões existentes ----
    var versoes = []
    try {
      var recs = $app.findRecordsByFilter('contratos', 'negocio = {:n}', '-versao', 100, 0, {
        n: negocioId,
      })
      for (var i = 0; i < recs.length; i++) {
        versoes.push({
          id: recs[i].id,
          versao: recs[i].get('versao'),
          status: String(recs[i].get('status') || ''),
          gerado_em: String(recs[i].get('gerado_em') || ''),
          gerado_por: String(recs[i].get('gerado_por') || ''),
        })
      }
    } catch (_) {}

    // ---- Completude: o que falta para gerar ----
    var faltando = []
    if (estagio !== 'fechado_ganho')
      faltando.push(
        'Oportunidade precisa estar na etapa Fechado ganho (atual: ' + (estagio || '—') + ')',
      )
    if (!empresaNome) faltando.push('Nome/razão social da empresa não identificado')
    if (valor === null || valor === undefined || Number(valor) <= 0)
      faltando.push('Valor da mensalidade não informado na oportunidade')

    return e.json(200, {
      negocio_id: negocioId,
      titulo: String(negocio.get('titulo') || ''),
      estagio: estagio,
      empresa: { id: empresaId, nome: empresaNome, cnpj: empresaCnpj },
      cliente: String(negocio.get('cliente') || ''),
      comercial: {
        valor: valor,
        servico: servico,
        recorrencia: recorrencia,
        data_ganho: dataGanho,
      },
      versoes: versoes,
      completude: { pode_gerar: faltando.length === 0, faltando: faltando },
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

    // CA-3-071: contrato só nasce de negócio ganho.
    if (String(negocio.get('estagio') || '') !== 'fechado_ganho') {
      return e.json(400, {
        error: 'Contrato só pode ser gerado para oportunidade na etapa Fechado ganho.',
      })
    }

    var body = e.requestInfo().body || {}

    // CA-3-072: dados mínimos obrigatórios (o CRM não tem — preenchidos na geração).
    var razaoSocial = String(body.razao_social || '').trim()
    var cnpj = String(body.cnpj || '').trim()
    var repContratante = String(body.representante_contratante || '').trim()
    var faltando = []
    if (!razaoSocial) faltando.push('Razão social da contratante')
    if (!cnpj) faltando.push('CNPJ da contratante')
    if (!repContratante) faltando.push('Representante legal da contratante')
    var valorNegocio = Number(negocio.get('valor') || 0)
    if (!(valorNegocio > 0)) faltando.push('Valor da mensalidade na oportunidade')
    if (faltando.length > 0) {
      return e.json(400, { error: 'Dados mínimos ausentes.', faltando: faltando })
    }

    // ---- Variáveis do template (D15: preenchidas na hora da geração) ----
    var servico = String(negocio.get('servico') || '')
    var recorrencia = String(negocio.get('recorrencia') || 'mensal')
    var mapaServico = {
      bpo_financeiro: 'BPO Financeiro Estratégico',
      tesouraria: 'Tesouraria',
      controladoria: 'Controladoria',
      cfo_as_a_service: 'CFO as a Service',
      outro: 'Serviços financeiros',
    }
    var nomeServico = mapaServico[servico] || 'Serviços financeiros'
    var escopoServicos =
      String(body.escopo_servicos || '').trim() ||
      'a) Execução das rotinas de ' +
        nomeServico +
        ' conforme procedimentos operacionais acordados entre as partes; b) entrega periódica de relatórios e leituras de decisão; c) suporte à gestão financeira no escopo acordado.'

    var mensalidade = valorNegocio
    var mensalFmt =
      'R$ ' +
      mensalidade.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    var implTotal = Number(body.implantacao_total || 0)
    var implFmt =
      implTotal > 0
        ? 'R$ ' +
          implTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : ''
    var condicoes = String(body.condicoes_financeiras || '').trim()
    if (!condicoes) {
      var linhas = []
      if (implTotal > 0) {
        linhas.push(
          'a) Implantação: ' +
            implFmt +
            ' (uma única vez), em até 2 (duas) parcelas, conforme acordado;',
        )
      }
      if (recorrencia === 'mensal') {
        linhas.push(
          'b) Mensalidade: ' +
            mensalFmt +
            ' por mês, vencida no início de cada ciclo de competência;',
        )
      } else {
        linhas.push(
          'b) Honorários: ' + mensalFmt + ', conforme recorrência acordada (' + recorrencia + ');',
        )
      }
      linhas.push(
        'c) Parcela anual complementar, quando aplicável, emitida em novembro de cada ano-calendário;',
      )
      condicoes = linhas.join('\n')
    }

    var vigenciaInicio =
      String(body.vigencia_inicio || '').trim() ||
      String(negocio.get('data_ganho') || '').slice(0, 10)
    var dados = {
      razao_social: razaoSocial,
      cnpj: cnpj,
      sede_contratante: String(body.sede_contratante || '').trim(),
      representante_contratante: repContratante,
      representante_prestador: String(body.representante_prestador || 'Deniane Bezerra').trim(),
      escopo_servicos: escopoServicos,
      implantacao_total: implTotal,
      mensalidade: mensalidade,
      recorrencia: recorrencia,
      condicoes_financeiras: condicoes,
      vigencia_inicio: vigenciaInicio,
      foro: String(body.foro || 'São Paulo/SP').trim(),
      reajuste_indice: String(body.reajuste_indice || 'IPCA').trim(),
    }

    // ---- Preenche o template (inline — sem helper top-level) ----
    var prestadora = {
      razao_social: 'Vibratto Assessoria Empresarial Ltda.',
      cnpj: String(body.cnpj_prestador || '').trim(),
      sede: String(body.sede_prestador || '').trim(),
      rep: dados.representante_prestador,
    }
    // Template INLINE no escopo do callback (AP-0200: variável top-level de qualquer
    // arquivo NÃO é visível dentro do callback no runtime goja — causa raiz do 400
    // genérico provado por API na T3.17).
    var texto = [
      'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE BPO FINANCEIRO, CONTROLADORIA E GESTÃO FINANCEIRA',
      '',
      '{{RAZAO_SOCIAL_PRESTADOR}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{CNPJ_PRESTADOR}}, com sede em {{SEDE_PRESTADOR}}, neste ato representada por {{REP_PRESTADOR}}, doravante denominada PRESTADORA, e, de outro lado, {{RAZAO_SOCIAL_CONTRATANTE}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{CNPJ_CONTRATANTE}}, com sede em {{SEDE_CONTRATANTE}}, neste ato representada por {{REP_CONTRATANTE}}, doravante denominada CONTRATANTE.',
      '',
      'As partes têm, entre si, justo e acertado o presente Contrato de Prestação de Serviços, que se regerá pelas cláusulas seguintes e pelas condições descritas no presente.',
      '',
      'CLÁUSULA 1ª — DO OBJETO',
      '',
      '1.1. O presente contrato tem como objeto a prestação, pela PRESTADORA, dos seguintes serviços:',
      '',
      '{{ESCOPO_SERVICOS}}',
      '',
      '1.2. A prestação dos serviços inclui a implantação das rotinas objeto deste contrato, compreendendo a criação dos acessos e da estrutura operacional, a análise das informações financeiras da CONTRATANTE e o diagnóstico, definição e validação dos processos do dia a dia, com apresentação do sistema de gestão.',
      '',
      '1.3. A prestadora realizará diagnóstico tributário preliminar das operações da CONTRATANTE, sem emissão de parecer contábil, fiscal ou jurídico — eventuais conclusões desse diagnóstico serão sempre validadas com o profissional responsável da CONTRATANTE.',
      '',
      '1.4. A execução de pagamentos, transferências e movimentações bancárias em nome da CONTRATANTE dependerá de alçada expressamente autorizada por ela, registrada por escrito (e-mail ou sistema), com limites definidos pelas partes.',
      '',
      '1.5. Os serviços serão prestados de forma remota e/ou presencial, conforme a necessidade de cada rotina, sem exclusividade para qualquer das partes.',
      '',
      '1.6. A PRESTADORA não se obriga a resultados de mercado, concessão de crédito ou qualquer resultado econômico futuro — sua obrigação é de meio, com execução diligente das rotinas contratadas.',
      '',
      'CLÁUSULA 2ª — DAS OBRIGAÇÕES DA PRESTADORA',
      '',
      '2.1. Executar as rotinas contratadas conforme os procedimentos operacionais acordados, com rastreabilidade de cada passo registrado.',
      '2.2. Entregar relatórios e leituras de decisão nos prazos acordados, com números fiéis aos registros — sem arredondamento ou apresentação que induza conclusão equivocada.',
      '2.3. Manter sigilo sobre todas as informações da CONTRATANTE, durante e após a vigência, e tratar dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).',
      '2.4. Comunicar prontamente a CONTRATANTE qualquer fato que impeça ou comprometa a execução das rotinas.',
      '',
      'CLÁUSULA 3ª — DAS OBRIGAÇÕES DA CONTRATANTE',
      '',
      '3.1. Fornecer, no prazo acordado, os acessos, documentos e informações necessários à execução dos serviços, inclusive credenciais de sistemas por meio seguro.',
      '3.2. Designar responsável pela validação de rotinas, autorizações e aprovações.',
      '3.3. Efetuar os pagamentos nas datas pactuadas na Cláusula 4ª.',
      '3.4. Manter a contabilidade e as obrigações fiscais com profissional próprio ou contratado, não constituindo objeto deste contrato a substituição dessas funções, salvo disposição expressa em contrário no escopo.',
      '',
      'CLÁUSULA 4ª — DO PRAZO',
      '',
      '4.1. O presente contrato terá vigência de 12 (doze) meses, iniciando-se em {{VIGENCIA_INICIO}}, renovando-se automaticamente por períodos sucessivos de 12 (doze) meses, salvo denúncia de qualquer das partes.',
      '',
      'CLÁUSULA 5ª — DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO',
      '',
      '5.1. Pela execução dos serviços, a CONTRATANTE pagará à PRESTADORA:',
      '',
      '{{CONDICOES_FINANCEIRAS}}',
      '',
      '5.2. Os valores serão reajustados anualmente pelo {{REAJUSTE_INDICE}} ou pelo índice legal que vier a substituí-lo, incidindo a partir da data-base.',
      '5.3. A implantação é cobrada uma única vez, nas parcelas indicadas acima, e não é reajustada nem devolvida em caso de rescisão por culpa da CONTRATANTE.',
      '5.4. Pagamentos em atraso acarretarão multa de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês e correção monetária, além da faculdade de suspensão dos serviços após aviso prévio de 5 (cinco) dias úteis.',
      '',
      'CLÁUSULA 6ª — DA RESCISÃO',
      '',
      '6.1. Qualquer das partes poderá rescindir este contrato mediante aviso prévio de 30 (trinta) dias, por escrito.',
      '6.2. A rescisão por culpa da CONTRATANTE não exonera o pagamento dos serviços prestados até a data do efetivo desligamento, nem das parcelas de implantação vencidas.',
      '6.3. Rescindido o contrato, a PRESTADORA entregará à CONTRATANTE os documentos, planilhas e registros em seu poder, no prazo de até 15 (quinze) dias.',
      '',
      'CLÁUSULA 7ª — DO SIGILO E DA PROTEÇÃO DE DADOS',
      '',
      '7.1. As partes manterão sigilo sobre todas as informações comerciais, financeiras e cadastrais trocadas na execução deste contrato.',
      '7.2. O tratamento de dados pessoais observará a Lei nº 13.709/2018 (LGPD), limitando-se às finalidades da execução contratual.',
      '',
      'CLÁUSULA 8ª — DAS DISPOSIÇÕES GERAIS',
      '',
      '8.1. Este contrato não gera vínculo empregatício, societário ou de representação entre as partes.',
      '8.2. A PRESTADORA não responde por obrigações tributárias, trabalhistas ou fiscais da CONTRATANTE, cuja titularidade permanece com ela.',
      '8.3. Nenhuma renúncia de direito será presumida; as alterações deste contrato somente valerão por aditivo escrito assinado pelas partes.',
      '',
      'CLÁUSULA 9ª — DO FORO',
      '',
      '9.1. Fica eleito o foro da comarca de {{FORO}} para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.',
      '',
      'E, por estarem justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor.',
      '',
      'São Paulo, {{DATA_ASSINATURA}}.',
      '',
      '',
      '_______________________________________',
      '{{RAZAO_SOCIAL_PRESTADOR}}',
      '',
      '',
      '_______________________________________',
      '{{RAZAO_SOCIAL_CONTRATANTE}}',
    ].join('\n')
    var pares = [
      ['{{RAZAO_SOCIAL_PRESTADOR}}', prestadora.razao_social],
      ['{{CNPJ_PRESTADOR}}', prestadora.cnpj || '[[ CNPJ da Vibratto ]]'],
      ['{{SEDE_PRESTADOR}}', prestadora.sede || '[[ sede da Vibratto ]]'],
      ['{{REP_PRESTADOR}}', prestadora.rep],
      ['{{RAZAO_SOCIAL_CONTRATANTE}}', dados.razao_social],
      ['{{CNPJ_CONTRATANTE}}', dados.cnpj],
      ['{{SEDE_CONTRATANTE}}', dados.sede_contratante || '[[ sede da contratante ]]'],
      ['{{REP_CONTRATANTE}}', dados.representante_contratante],
      ['{{ESCOPO_SERVICOS}}', escopoServicos],
      ['{{CONDICOES_FINANCEIRAS}}', condicoes],
      ['{{VIGENCIA_INICIO}}', vigenciaInicio],
      ['{{REAJUSTE_INDICE}}', dados.reajuste_indice],
      ['{{FORO}}', dados.foro],
      ['{{DATA_ASSINATURA}}', new Date().toISOString().slice(0, 10)],
    ]
    for (var p = 0; p < pares.length; p++) {
      // split/join evita comportamento de regex em replace com caracteres especiais
      var partes = texto.split(pares[p][0])
      texto = partes.join(pares[p][1])
    }

    // ---- Versionamento: última versão + 1 (nenhuma sobrescrita) ----
    var ultima = 0
    try {
      var anteriores = $app.findRecordsByFilter('contratos', 'negocio = {:n}', '-versao', 1, 0, {
        n: negocioId,
      })
      if (anteriores.length > 0) ultima = Number(anteriores[0].get('versao') || 0)
    } catch (_) {}
    var novaVersao = ultima + 1

    var col = $app.findCollectionByNameOrId('contratos')
    var rec = new Record(col)
    rec.set('negocio', negocioId)
    rec.set('versao', novaVersao)
    rec.set('status', 'gerado')
    rec.set('conteudo', texto)
    rec.set('dados', JSON.stringify(dados))
    rec.set('gerado_por', actor.id)
    rec.set('gerado_em', new Date().toISOString())
    try {
      $app.save(rec)
    } catch (err) {
      $app.logger().error('T317 falha ao salvar contrato', 'error', String(err))
      return e.json(400, { error: 'Falha ao registrar o contrato: ' + String(err) })
    }

    // Auditoria (logar, não engolir — lição T3.12)
    try {
      var audit = $app.findCollectionByNameOrId('auditoria')
      var ev = new Record(audit)
      ev.set('entidade', 'contratos')
      ev.set('registro_id', rec.id)
      ev.set('acao', 'contrato_gerado')
      ev.set('ator_id', actor.id)
      ev.set('ocorrido_em', new Date().toISOString())
      ev.set('estado_anterior', '')
      ev.set('estado_posterior', JSON.stringify({ negocio: negocioId, versao: novaVersao }))
      $app.save(ev)
    } catch (errAudit) {
      $app.logger().error('T317 auditoria falhou', 'error', String(errAudit))
    }

    return e.json(200, {
      ok: true,
      id: rec.id,
      negocio: negocioId,
      versao: novaVersao,
      status: 'gerado',
      conteudo: texto,
      dados: dados,
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
      return e.json(403, { error: 'Leitura do contrato é exclusiva de admin/coordenação.' })
    }
    var negocioId = e.request.pathValue('negocioId')
    var versao = Number(e.request.pathValue('versao'))
    if (!Number.isFinite(versao) || versao <= 0) {
      return e.json(400, { error: 'Versão inválida.' })
    }
    var recs = $app.findRecordsByFilter(
      'contratos',
      'negocio = {:n} && versao = {:v}',
      '-created',
      1,
      0,
      { n: negocioId, v: versao },
    )
    if (recs.length === 0) {
      return e.json(404, { error: 'Versão de contrato não encontrada.' })
    }
    return e.json(200, {
      id: recs[0].id,
      negocio: negocioId,
      versao: recs[0].get('versao'),
      status: String(recs[0].get('status') || ''),
      gerado_em: String(recs[0].get('gerado_em') || ''),
      conteudo: String(recs[0].get('conteudo') || ''),
      dados: String(recs[0].get('dados') || '{}'),
    })
  },
  $apis.requireAuth(),
)
