// T3.08 — SPEC-3-007: comentários e notificações (append-only).
// comentarios: negocio (obrigatório), tarefa (opcional), autor (obrigatório),
// texto 1–2000, mencoes (json de user ids extraído server-side).
// notificacoes: usuario (obrigatório), tipo (mencao|tarefa_atribuida|comentario),
// origem (negocio opcional), origem_tarefa (opcional), comentario (opcional),
// lida (bool), lida_em (date). Create SOMENTE server-side (null); leitura
// apenas do próprio usuário; update limitado a marcar lida (hook valida);
// delete bloqueado.
// Lição AP-0200: atribuição direta field.values = [...] (NÃO .set('values')).
migrate(
  (app) => {
    var negocios = app.findCollectionByNameOrId('negocios')
    var tarefas = app.findCollectionByNameOrId('tarefas')
    var users = app.findCollectionByNameOrId('users')

    var existeCom = true
    try {
      app.findCollectionByNameOrId('comentarios')
    } catch (_) {
      existeCom = false
    }
    if (!existeCom) {
      var com = new Collection({
        name: 'comentarios',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'negocio', type: 'relation', collectionId: negocios.id, maxSelect: 1 },
          { name: 'tarefa', type: 'relation', collectionId: tarefas.id, maxSelect: 1 },
          { name: 'autor', type: 'relation', collectionId: users.id, required: true, maxSelect: 1 },
          { name: 'texto', type: 'text', required: true, max: 2000 },
          { name: 'mencoes', type: 'json', maxSize: 100000 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: [
          'CREATE INDEX idx_comentarios_negocio ON comentarios (negocio)',
          'CREATE INDEX idx_comentarios_created ON comentarios (created)',
        ],
      })
      app.save(com)
    }

    var existeNot = true
    try {
      app.findCollectionByNameOrId('notificacoes')
    } catch (_) {
      existeNot = false
    }
    if (!existeNot) {
      var not = new Collection({
        name: 'notificacoes',
        type: 'base',
        listRule: 'usuario = @request.auth.id',
        viewRule: 'usuario = @request.auth.id',
        createRule: null,
        updateRule: 'usuario = @request.auth.id',
        deleteRule: null,
        fields: [
          {
            name: 'usuario',
            type: 'relation',
            collectionId: users.id,
            required: true,
            maxSelect: 1,
          },
          {
            name: 'tipo',
            type: 'select',
            values: ['mencao', 'tarefa_atribuida', 'comentario'],
            maxSelect: 1,
          },
          { name: 'origem', type: 'relation', collectionId: negocios.id, maxSelect: 1 },
          { name: 'origem_tarefa', type: 'relation', collectionId: tarefas.id, maxSelect: 1 },
          { name: 'comentario', type: 'relation', collectionId: com.id, maxSelect: 1 },
          { name: 'lida', type: 'bool' },
          { name: 'lida_em', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: [
          'CREATE INDEX idx_notificacoes_usuario ON notificacoes (usuario)',
          'CREATE INDEX idx_notificacoes_lida ON notificacoes (lida)',
        ],
      })
      app.save(not)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('notificacoes'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('comentarios'))
    } catch (_) {}
  },
)
