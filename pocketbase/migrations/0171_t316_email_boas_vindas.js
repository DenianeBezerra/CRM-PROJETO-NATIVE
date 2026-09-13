// T3.16 ajuste (CEO 22:44): auditoria ganha a ação 'email_boas_vindas_gerado'
// (e-mail de boas-vindas gerado pelo CRM na implantação).

migrate(
  (app) => {
    var au = app.findCollectionByNameOrId('auditoria')
    var campoAcao = au.fields.getByName('acao')
    var valores = campoAcao.values || []
    if (valores.indexOf('email_boas_vindas_gerado') < 0) {
      valores.push('email_boas_vindas_gerado')
      campoAcao.values = valores
      app.save(au)
    }
  },
  (app) => {
    // down: mantém (ação inofensiva)
  },
)
