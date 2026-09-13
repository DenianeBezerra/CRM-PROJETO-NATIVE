// T3.16 ajuste — a implantação de teste criada pela CEO na tela (empresa AG) ficou com o
// modelo ANTIGO de 7 etapas. Esta migration remove as 7 etapas antigas e instancia as
// 3 etapas reais do processo da Vibratto, preservando a implantação e o estado da empresa.

migrate(
  (app) => {
    var implId = 'hj0u2yv1k9m3n5q'
    // localizar a implantação da empresa AG dinamicamente (id pode variar)
    var ags = app.findRecordsByFilter('empresas', "nome = 'AG'", '', 1, 0)
    if (ags.length === 0) return
    var agId = ags[0].id
    var imps = app.findRecordsByFilter('implantacoes', 'empresa = {:e}', '', 1, 0, { e: agId })
    if (imps.length === 0) return
    var im = imps[0]

    // remover etapas antigas (modelo 7)
    var etapas = app.findRecordsByFilter(
      'implantacao_etapas',
      'implantacao = {:i}',
      'ordem',
      100,
      0,
      { i: im.id },
    )
    var concluidas = []
    for (var i = 0; i < etapas.length; i++) {
      if (String(etapas[i].get('status')) === 'concluida') {
        concluidas.push(String(etapas[i].get('titulo')))
      }
      app.delete(etapas[i])
    }

    // instanciar modelo real de 3 etapas
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
    var col = app.findCollectionByNameOrId('implantacao_etapas')
    for (var m = 0; m < MODELO.length; m++) {
      var et = new Record(col)
      et.set('implantacao', im.id)
      et.set('ordem', m + 1)
      et.set('titulo', MODELO[m][0])
      et.set('descricao', MODELO[m][1])
      et.set('status', 'pendente')
      app.save(et)
    }
  },
  (app) => {},
)
