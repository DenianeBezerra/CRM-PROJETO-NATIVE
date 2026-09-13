// T3.16 — correção: a migration 0166 criou as coleções implantacoes/implantacao_etapas
// SEM os campos (construtores de campo não aplicados no runtime de migration do pod).
// Esta migration adiciona os campos idempotentemente às coleções existentes.
// Lição: em migrations deste runtime, campos de coleção nova devem ser adicionados
// APÓS o save da coleção vazia, via fields.add com construtores tipados.

migrate(
  (app) => {
    // --- implantacoes ---
    var im = app.findCollectionByNameOrId('implantacoes')
    var nomesIm = []
    for (var fi = 0; fi < im.fields.length; fi++) nomesIm.push(im.fields[fi].name)
    if (nomesIm.indexOf('empresa') < 0)
      im.fields.add(
        new RelationField({
          name: 'empresa',
          required: true,
          maxSelect: 1,
          collectionId: app.findCollectionByNameOrId('empresas').id,
        }),
      )
    if (nomesIm.indexOf('modelo') < 0)
      im.fields.add(
        new SelectField({ name: 'modelo', required: true, maxSelect: 1, values: ['padrao'] }),
      )
    if (nomesIm.indexOf('status') < 0)
      im.fields.add(
        new SelectField({
          name: 'status',
          required: true,
          maxSelect: 1,
          values: ['em_andamento', 'concluida', 'cancelada'],
        }),
      )
    if (nomesIm.indexOf('responsavel') < 0)
      im.fields.add(
        new RelationField({
          name: 'responsavel',
          required: false,
          maxSelect: 1,
          collectionId: app.findCollectionByNameOrId('users').id,
        }),
      )
    if (nomesIm.indexOf('data_inicio') < 0)
      im.fields.add(new DateField({ name: 'data_inicio', required: false }))
    if (nomesIm.indexOf('data_conclusao') < 0)
      im.fields.add(new DateField({ name: 'data_conclusao', required: false }))
    if (
      im.indexes.indexOf('CREATE UNIQUE INDEX idx_implantacoes_empresa ON implantacoes (empresa)') <
      0
    ) {
      im.indexes.push('CREATE UNIQUE INDEX idx_implantacoes_empresa ON implantacoes (empresa)')
    }
    app.save(im)

    // --- implantacao_etapas ---
    var et = app.findCollectionByNameOrId('implantacao_etapas')
    var nomesEt = []
    for (var fj = 0; fj < et.fields.length; fj++) nomesEt.push(et.fields[fj].name)
    if (nomesEt.indexOf('implantacao') < 0)
      et.fields.add(
        new RelationField({
          name: 'implantacao',
          required: true,
          maxSelect: 1,
          collectionId: app.findCollectionByNameOrId('implantacoes').id,
        }),
      )
    if (nomesEt.indexOf('ordem') < 0)
      et.fields.add(new NumberField({ name: 'ordem', required: true, onlyInt: true }))
    if (nomesEt.indexOf('titulo') < 0)
      et.fields.add(new TextField({ name: 'titulo', required: true, max: 200 }))
    if (nomesEt.indexOf('descricao') < 0)
      et.fields.add(new TextField({ name: 'descricao', required: false, max: 1000 }))
    if (nomesEt.indexOf('responsavel') < 0)
      et.fields.add(
        new RelationField({
          name: 'responsavel',
          required: false,
          maxSelect: 1,
          collectionId: app.findCollectionByNameOrId('users').id,
        }),
      )
    if (nomesEt.indexOf('prazo') < 0)
      et.fields.add(new DateField({ name: 'prazo', required: false }))
    if (nomesEt.indexOf('status') < 0)
      et.fields.add(
        new SelectField({
          name: 'status',
          required: true,
          maxSelect: 1,
          values: ['pendente', 'em_andamento', 'concluida', 'nao_aplicavel'],
        }),
      )
    if (nomesEt.indexOf('evidencia') < 0)
      et.fields.add(new TextField({ name: 'evidencia', required: false, max: 2000 }))
    if (nomesEt.indexOf('concluida_em') < 0)
      et.fields.add(new DateField({ name: 'concluida_em', required: false }))
    if (
      et.indexes.indexOf(
        'CREATE INDEX idx_impl_etapas_impl ON implantacao_etapas (implantacao, ordem)',
      ) < 0
    ) {
      et.indexes.push(
        'CREATE INDEX idx_impl_etapas_impl ON implantacao_etapas (implantacao, ordem)',
      )
    }
    app.save(et)
  },
  (app) => {
    // down: remove os campos adicionados (coleções permanecem)
    var im = app.findCollectionByNameOrId('implantacoes')
    var camposIm = ['empresa', 'modelo', 'status', 'responsavel', 'data_inicio', 'data_conclusao']
    for (var i = 0; i < camposIm.length; i++) {
      try {
        im.fields.removeByName(camposIm[i])
      } catch (_) {}
    }
    app.save(im)
    var et = app.findCollectionByNameOrId('implantacao_etapas')
    var camposEt = [
      'implantacao',
      'ordem',
      'titulo',
      'descricao',
      'responsavel',
      'prazo',
      'status',
      'evidencia',
      'concluida_em',
    ]
    for (var j = 0; j < camposEt.length; j++) {
      try {
        et.fields.removeByName(camposEt[j])
      } catch (_) {}
    }
    app.save(et)
  },
)
