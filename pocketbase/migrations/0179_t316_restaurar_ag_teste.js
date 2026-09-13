// T3.16 — restauração do estado real da AG após o teste humano executado pela Deni.Ai:
// a etapa 1 ("Acessos e estrutura") foi concluída durante o teste com evidência de teste.
// Esta migration devolve a etapa ao status pendente e limpa a evidência de teste.

migrate(
  (app) => {
    var etapaId = 'r21bza7te925ydu'
    var et = app.findRecordById('implantacao_etapas', etapaId)
    et.set('status', 'pendente')
    et.set('evidencia', '')
    et.set('concluida_em', null)
    app.save(et)
  },
  (app) => {},
)
