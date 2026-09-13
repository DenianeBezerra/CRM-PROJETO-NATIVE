// T3.21 — Ajustes 1+2 da CEO (16/09): convenção do identificador D17.
// 1) Hífen em TODO o identificador (linha de solução usava sublinhado).
// 2) Linha abreviada: bpo, tesouraria, controladoria, cfo, consultoria, institucional.
// 3) Tema = assunto curto (não o título): peças existentes têm o tema
//    normalizado para a forma curta antes do primeiro link real circular.
// Correção prévia à circulação real — imutabilidade torna o slug caro depois.
migrate(
  (app) => {
    var LINHA_ABR = {
      bpo_financeiro: 'bpo',
      tesouraria: 'tesouraria',
      controladoria: 'controladoria',
      cfo_as_a_service: 'cfo',
      consultoria: 'consultoria',
      institucional: 'institucional',
    }
    var slugify = function (s) {
      return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    // ---- Campanhas existentes: reconstrói o identificador no padrão. ----
    var camps = app.findRecordsByFilter('campanhas', '', '', 500, 0)
    for (var i = 0; i < camps.length; i++) {
      var c = camps[i]
      var antigo = String(c.get('identificador') || '')
      var partes = antigo.split('-')
      var ano = partes[0] || String(new Date().getFullYear())
      var linhaAbr = 'institucional'
      var resto = partes.slice(1).join('-')
      for (var chave in LINHA_ABR) {
        if (resto.indexOf(chave) === 0) {
          linhaAbr = LINHA_ABR[chave]
          resto = resto.slice(chave.length)
          if (resto.indexOf('-') === 0) resto = resto.slice(1)
          break
        }
      }
      var temaCurto = resto
      if (antigo.indexOf('prova-validacao') >= 0) temaCurto = 'prova-validacao'
      var novo = ano + '-' + linhaAbr + '-' + (slugify(temaCurto) || 'conteudo')
      if (novo !== antigo) {
        c.set('identificador', novo)
        app.save(c)
        app.logger().info('T321 D17 campanha corrigida', antigo, '->', novo)
      }
    }

    // ---- Peças existentes: tema curto (o título longo não compõe slug). ----
    var conteudos = app.findRecordsByFilter('conteudos', '', '', 500, 0)
    var TEMAS_CURTOS = {
      'split payment no simples — o que muda em 2026': 'split payment',
      'prova validacao': 'prova validacao',
      'prova links': 'prova links',
    }
    for (var j = 0; j < conteudos.length; j++) {
      var r = conteudos[j]
      var temaAtual = String(r.get('tema') || '')
      var chave = temaAtual.toLowerCase()
      if (TEMAS_CURTOS[chave] && temaAtual !== TEMAS_CURTOS[chave]) {
        r.set('tema', TEMAS_CURTOS[chave])
        app.save(r)
        app.logger().info('T321 D17 tema normalizado', temaAtual, '->', TEMAS_CURTOS[chave])
      }
    }
  },
  (app) => {},
)
