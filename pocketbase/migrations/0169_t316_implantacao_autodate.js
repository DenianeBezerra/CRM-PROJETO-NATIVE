// T3.16 — correção 2: as coleções implantacoes/implantacao_etapas nasceram SEM os
// campos autodate created/updated (a migration 0166 não os definiu), o que quebra
// qualquer sort por -created (GET /implantacoes dava 400).
// Esta migration adiciona created/updated (autodate) às duas coleções.

migrate(
  (app) => {
    var im = app.findCollectionByNameOrId('implantacoes')
    var nomes = []
    for (var i = 0; i < im.fields.length; i++) nomes.push(im.fields[i].name)
    if (nomes.indexOf('created') < 0)
      im.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
    if (nomes.indexOf('updated') < 0)
      im.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
    app.save(im)

    var et = app.findCollectionByNameOrId('implantacao_etapas')
    var nomes2 = []
    for (var j = 0; j < et.fields.length; j++) nomes2.push(et.fields[j].name)
    if (nomes2.indexOf('created') < 0)
      et.fields.add(new AutodateField({ name: 'created', onCreate: true, onUpdate: false }))
    if (nomes2.indexOf('updated') < 0)
      et.fields.add(new AutodateField({ name: 'updated', onCreate: true, onUpdate: true }))
    app.save(et)
  },
  (app) => {
    var im = app.findCollectionByNameOrId('implantacoes')
    try {
      im.fields.removeByName('created')
    } catch (_) {}
    try {
      im.fields.removeByName('updated')
    } catch (_) {}
    app.save(im)
    var et = app.findCollectionByNameOrId('implantacao_etapas')
    try {
      et.fields.removeByName('created')
    } catch (_) {}
    try {
      et.fields.removeByName('updated')
    } catch (_) {}
    app.save(et)
  },
)
