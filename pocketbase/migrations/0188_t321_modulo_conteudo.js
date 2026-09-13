// T3.21 — SPEC-3-021 Leva A: Módulo de Conteúdo.
// Coleções: conteudos (objeto central, 10 etapas), conteudo_eventos (timeline
// append-only), ativos (biblioteca mínima), series (mínima, seed D22:
// Newsletter + Deni Entrevista), campanhas (mínima, slug D17 imutável).
// users.role += social_media (cap. 11: prestadora externa sem acesso aos
// demais módulos). Delete bloqueado em conteudos/conteudo_eventos/ativos.
// Lições aplicadas: field.values = [...] direto (AP-0200); autodate explícitos;
// índices após campos; coleção nova = save vazio + fields.add (0168).
migrate(
  (app) => {
    var users = app.findCollectionByNameOrId('users')
    var campoRole = users.fields.getByName('role')
    var vals = campoRole.values || []
    if (vals.indexOf('social_media') < 0) {
      vals.push('social_media')
      campoRole.values = vals
      app.save(users)
    }

    // ---------- ativos (biblioteca mínima) ----------
    var existeAtivos = true
    try {
      app.findCollectionByNameOrId('ativos')
    } catch (_) {
      existeAtivos = false
    }
    if (!existeAtivos) {
      var colA = new Collection({
        name: 'ativos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'social_media'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'social_media'",
        deleteRule: null,
        fields: [],
      })
      app.save(colA)
      colA.fields.add(new TextField({ name: 'nome', required: true, max: 200 }))
      colA.fields.add(
        new SelectField({
          name: 'tipo',
          required: true,
          maxSelect: 1,
          values: [
            'foto_profissional',
            'arte',
            'video_bruto',
            'video_final',
            'logotipo',
            'apresentacao',
            'documento_institucional',
            'depoimento',
            'capa',
          ],
        }),
      )
      colA.fields.add(
        new FileField({ name: 'arquivo', required: true, maxSelect: 5, maxSize: 52428800 }),
      )
      colA.fields.add(new BoolField({ name: 'vigente' }))
      colA.fields.add(new TextField({ name: 'tags', max: 500 }))
      colA.fields.add(
        new RelationField({ name: 'criado_por', maxSelect: 1, collectionId: users.id }),
      )
      colA.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
      colA.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
      colA.indexes = ['CREATE INDEX idx_ativos_tipo ON ativos (tipo)']
      app.save(colA)
    }

    // ---------- series (mínima) ----------
    var existeSeries = true
    try {
      app.findCollectionByNameOrId('series')
    } catch (_) {
      existeSeries = false
    }
    if (!existeSeries) {
      var colS = new Collection({
        name: 'series',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'social_media'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'social_media'",
        deleteRule: null,
        fields: [],
      })
      app.save(colS)
      colS.fields.add(new TextField({ name: 'nome', required: true, max: 200 }))
      colS.fields.add(new TextField({ name: 'descricao', max: 2000 }))
      colS.fields.add(
        new SelectField({
          name: 'periodicidade',
          required: true,
          maxSelect: 1,
          values: ['semanal', 'quinzenal', 'mensal', 'sob_demanda'],
        }),
      )
      colS.fields.add(
        new SelectField({
          name: 'canais',
          maxSelect: 6,
          values: ['instagram', 'linkedin', 'tiktok', 'youtube', 'newsletter', 'site'],
        }),
      )
      colS.fields.add(
        new RelationField({ name: 'responsavel', maxSelect: 1, collectionId: users.id }),
      )
      colS.fields.add(
        new SelectField({
          name: 'status',
          required: true,
          maxSelect: 1,
          values: ['ativa', 'pausada', 'encerrada'],
        }),
      )
      colS.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
      colS.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
      app.save(colS)
      // Seed D22: Newsletter + Deni Entrevista
      var seed = [
        {
          nome: 'Newsletter',
          periodicidade: 'semanal',
          canais: ['newsletter'],
          status: 'ativa',
          descricao: 'Série editorial Newsletter — conteúdo recorrente por e-mail.',
        },
        {
          nome: 'Deni Entrevista',
          periodicidade: 'mensal',
          canais: ['instagram', 'linkedin', 'youtube'],
          status: 'ativa',
          descricao:
            'Série editorial Deni Entrevista — entrevistas com empresários e especialistas.',
        },
      ]
      for (var s = 0; s < seed.length; s++) {
        var r = new Record(colS)
        r.set('nome', seed[s].nome)
        r.set('periodicidade', seed[s].periodicidade)
        r.set('canais', seed[s].canais)
        r.set('status', seed[s].status)
        r.set('descricao', seed[s].descricao)
        app.save(r)
      }
    }

    // ---------- campanhas (mínima) ----------
    var existeCamp = true
    try {
      app.findCollectionByNameOrId('campanhas')
    } catch (_) {
      existeCamp = false
    }
    if (!existeCamp) {
      var colC = new Collection({
        name: 'campanhas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'social_media'",
        updateRule: "@request.auth.id != '' && @request.auth.role != 'social_media'",
        deleteRule: null,
        fields: [],
      })
      app.save(colC)
      colC.fields.add(new TextField({ name: 'nome', required: true, max: 200 }))
      colC.fields.add(new TextField({ name: 'identificador', required: true, max: 120 }))
      colC.fields.add(
        new SelectField({
          name: 'tipo',
          required: true,
          maxSelect: 1,
          values: ['organica', 'paga', 'mista'],
        }),
      )
      colC.fields.add(
        new SelectField({
          name: 'objetivo',
          required: true,
          maxSelect: 1,
          values: ['geracao_lead', 'lancamento', 'autoridade', 'evento', 'reativacao'],
        }),
      )
      colC.fields.add(
        new SelectField({
          name: 'linha_solucao',
          required: true,
          maxSelect: 1,
          values: [
            'bpo_financeiro',
            'tesouraria',
            'controladoria',
            'cfo_as_a_service',
            'consultoria',
            'institucional',
          ],
        }),
      )
      colC.fields.add(new DateField({ name: 'periodo_inicio' }))
      colC.fields.add(new DateField({ name: 'periodo_fim' }))
      colC.fields.add(
        new SelectField({
          name: 'status',
          required: true,
          maxSelect: 1,
          values: ['planejada', 'em_andamento', 'encerrada'],
        }),
      )
      colC.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
      colC.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
      colC.indexes = [
        'CREATE UNIQUE INDEX idx_campanhas_identificador ON campanhas (identificador)',
      ]
      app.save(colC)
    }

    // ---------- conteudos (objeto central) ----------
    var existeCont = true
    try {
      app.findCollectionByNameOrId('conteudos')
    } catch (_) {
      existeCont = false
    }
    if (!existeCont) {
      var col = new Collection({
        name: 'conteudos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'social_media'",
        updateRule: "@request.auth.id != ''",
        deleteRule: null,
        fields: [],
      })
      app.save(col)
      col.fields.add(new TextField({ name: 'titulo_interno', required: true, max: 200 }))
      col.fields.add(
        new SelectField({
          name: 'formato',
          required: true,
          maxSelect: 1,
          values: [
            'post_estatico',
            'carrossel',
            'reel',
            'video_longo',
            'artigo',
            'newsletter',
            'story',
            'live',
          ],
        }),
      )
      col.fields.add(
        new SelectField({
          name: 'canais_destino',
          required: true,
          maxSelect: 6,
          values: ['instagram', 'linkedin', 'tiktok', 'youtube', 'newsletter', 'site'],
        }),
      )
      col.fields.add(
        new RelationField({
          name: 'serie',
          maxSelect: 1,
          collectionId: app.findCollectionByNameOrId('series').id,
        }),
      )
      col.fields.add(
        new RelationField({
          name: 'campanha',
          maxSelect: 1,
          collectionId: app.findCollectionByNameOrId('campanhas').id,
        }),
      )
      col.fields.add(new TextField({ name: 'tema', required: true, max: 300 }))
      col.fields.add(
        new SelectField({
          name: 'linha_solucao',
          required: true,
          maxSelect: 1,
          values: [
            'bpo_financeiro',
            'tesouraria',
            'controladoria',
            'cfo_as_a_service',
            'consultoria',
            'institucional',
          ],
        }),
      )
      col.fields.add(
        new SelectField({
          name: 'objetivo',
          required: true,
          maxSelect: 1,
          values: ['autoridade', 'geracao_lead', 'engajamento', 'venda_direta', 'institucional'],
        }),
      )
      col.fields.add(new TextField({ name: 'gancho', max: 500 }))
      col.fields.add(new TextField({ name: 'roteiro', max: 20000 }))
      col.fields.add(new TextField({ name: 'legenda', max: 5000 }))
      col.fields.add(
        new RelationField({
          name: 'capa',
          maxSelect: 1,
          collectionId: app.findCollectionByNameOrId('ativos').id,
        }),
      )
      col.fields.add(
        new RelationField({
          name: 'arquivo_final',
          maxSelect: 1,
          collectionId: app.findCollectionByNameOrId('ativos').id,
        }),
      )
      col.fields.add(
        new RelationField({ name: 'responsavel_producao', maxSelect: 1, collectionId: users.id }),
      )
      col.fields.add(new RelationField({ name: 'aprovador', maxSelect: 1, collectionId: users.id }))
      col.fields.add(
        new RelationField({ name: 'aprovador_reserva', maxSelect: 1, collectionId: users.id }),
      )
      col.fields.add(new BoolField({ name: 'ausencia_registrada' }))
      col.fields.add(new DateField({ name: 'data_prevista' }))
      col.fields.add(new DateField({ name: 'data_efetiva' }))
      col.fields.add(
        new SelectField({
          name: 'status',
          required: true,
          maxSelect: 1,
          values: [
            'ideia',
            'pauta_aprovada',
            'roteiro',
            'producao',
            'edicao',
            'aprovacao',
            'pronto_para_publicar',
            'agendado',
            'publicado',
            'arquivado',
          ],
        }),
      )
      col.fields.add(new TextField({ name: 'destino_link', max: 500 }))
      col.fields.add(new JSONField({ name: 'links_rastreaveis', maxSize: 2000000 }))
      col.fields.add(new JSONField({ name: 'url_publicacao', maxSize: 2000000 }))
      col.fields.add(new TextField({ name: 'observacoes', max: 2000 }))
      col.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
      col.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
      col.indexes = [
        'CREATE INDEX idx_conteudos_status ON conteudos (status)',
        'CREATE INDEX idx_conteudos_data_prevista ON conteudos (data_prevista)',
      ]
      app.save(col)
    }

    // ---------- conteudo_eventos (timeline append-only) ----------
    var existeEv = true
    try {
      app.findCollectionByNameOrId('conteudo_eventos')
    } catch (_) {
      existeEv = false
    }
    if (!existeEv) {
      var colE = new Collection({
        name: 'conteudo_eventos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && @request.auth.role != 'social_media'",
        updateRule: null,
        deleteRule: null,
        fields: [],
      })
      app.save(colE)
      colE.fields.add(
        new RelationField({
          name: 'conteudo',
          required: true,
          maxSelect: 1,
          collectionId: app.findCollectionByNameOrId('conteudos').id,
        }),
      )
      colE.fields.add(new TextField({ name: 'etapa_de', max: 50 }))
      colE.fields.add(new TextField({ name: 'etapa_para', required: true, max: 50 }))
      colE.fields.add(new TextField({ name: 'motivo', max: 1000 }))
      colE.fields.add(
        new RelationField({ name: 'autor', required: true, maxSelect: 1, collectionId: users.id }),
      )
      colE.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
      colE.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
      colE.indexes = ['CREATE INDEX idx_cevent_conteudo ON conteudo_eventos (conteudo)']
      app.save(colE)
    }
  },
  (app) => {
    var nomes = ['conteudo_eventos', 'conteudos', 'campanhas', 'series', 'ativos']
    for (var i = 0; i < nomes.length; i++) {
      try {
        app.delete(app.findCollectionByNameOrId(nomes[i]))
      } catch (_) {}
    }
    try {
      var users = app.findCollectionByNameOrId('users')
      var campoRole = users.fields.getByName('role')
      var vals = campoRole.values || []
      var ix = vals.indexOf('social_media')
      if (ix >= 0) {
        vals.splice(ix, 1)
        campoRole.values = vals
        app.save(users)
      }
    } catch (_) {}
  },
)
