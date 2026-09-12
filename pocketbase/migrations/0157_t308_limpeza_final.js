// T3.08 — limpeza final: notificação de menção apontando para comentário de
// prova removido em 0156 (referência órfã). SQL direto (lição T3.02).
// Regra: só remove notificação cujo comentário de origem NÃO EXISTE mais.
migrate(
  (app) => {
    app
      .db()
      .newQuery(
        "DELETE FROM notificacoes WHERE comentario != '' AND comentario NOT IN (SELECT id FROM comentarios)",
      )
      .execute()
  },
  (app) => {},
)
