// T3.12 — SPEC-3-012 (Leva B): Motor de Rotinas + Exceções.
// Coleções: obrigacoes (geradas pelo motor — NUNCA manuais), excecoes (10 tipos).
// Delete bloqueado (histórico operacional). Create via API collection bloqueado
// (createRule null) — criação só pelo hook do motor (contexto sistema).
// Lição AP-0200: atribuição direta field.values = [...] (NÃO .set('values')).
migrate(
  (app) => {
    var empresas = app.findCollectionByNameOrId('empresas')
    var fichas = app.findCollectionByNameOrId('fichas_operacionais')
    var users = app.findCollectionByNameOrId('users')

    var existe = true
    try {
      app.findCollectionByNameOrId('obrigacoes')
    } catch (_) {
      existe = false
    }
    if (!existe) {
      var ob = new Collection({
        name: 'obrigacoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: "@request.auth.id != ''",
        deleteRule: null,
        fields: [
          {
            name: 'tipo',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: [
              'coleta_canal',
              'lancamento',
              'projecao',
              'envio_autorizacao',
              'cadastro_banco',
              'conciliacao',
              'relatorio_faturamento',
              'emissao_nota',
              'entrega_nota',
              'validacao',
              'fechamento',
              'entrega_contabilidade',
            ],
          },
          {
            name: 'cliente',
            type: 'relation',
            collectionId: empresas.id,
            required: true,
            maxSelect: 1,
          },
          {
            name: 'ficha',
            type: 'relation',
            collectionId: fichas.id,
            required: true,
            maxSelect: 1,
          },
          {
            name: 'responsavel',
            type: 'relation',
            collectionId: users.id,
            required: true,
            maxSelect: 1,
          },
          { name: 'substituicao_aplicada', type: 'bool' },
          { name: 'data_prevista', type: 'date', required: true },
          { name: 'prazo_limite', type: 'date', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: [
              'prevista',
              'em_execucao',
              'concluida',
              'atrasada',
              'bloqueada',
              'nao_aplicavel',
            ],
          },
          { name: 'motivo_bloqueio', type: 'text', max: 1000 },
          { name: 'evidencia', type: 'text', max: 2000 },
          { name: 'data_conclusao', type: 'date' },
          { name: 'concluida_por', type: 'relation', collectionId: users.id, maxSelect: 1 },
          { name: 'gerada_em', type: 'date', required: true },
          { name: 'ciclo_chave', type: 'text', required: true, max: 120 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_obrigacoes_ciclo ON obrigacoes (ciclo_chave)',
          'CREATE INDEX idx_obrigacoes_resp_status ON obrigacoes (responsavel, status)',
        ],
      })
      app.save(ob)
    }

    var existeEx = true
    try {
      app.findCollectionByNameOrId('excecoes')
    } catch (_) {
      existeEx = false
    }
    if (!existeEx) {
      var ex = new Collection({
        name: 'excecoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: "@request.auth.id != ''",
        deleteRule: null,
        fields: [
          {
            name: 'tipo',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: [
              'autorizacao_pendente',
              'aprovacao_bancaria_pendente',
              'pagamento_nao_conciliado',
              'relatorio_sem_aceite',
              'nota_nao_emitida',
              'nota_nao_entregue',
              'recebimento_atrasado',
              'documento_faltante',
              'entrega_contabilidade_pendente',
              'obrigacao_atrasada',
            ],
          },
          {
            name: 'cliente',
            type: 'relation',
            collectionId: empresas.id,
            required: true,
            maxSelect: 1,
          },
          {
            name: 'obrigacao',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('obrigacoes').id,
            maxSelect: 1,
          },
          { name: 'descricao', type: 'text', max: 1000 },
          { name: 'aberta_em', type: 'date', required: true },
          { name: 'destinatario_analista', type: 'relation', collectionId: users.id, maxSelect: 1 },
          { name: 'escalada_coordenacao', type: 'bool' },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['aberta', 'resolvida'],
          },
          { name: 'resolvida_em', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: ['CREATE INDEX idx_excecoes_cliente ON excecoes (cliente, status)'],
      })
      app.save(ex)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('excecoes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('obrigacoes'))
    } catch (_) {}
  },
)
