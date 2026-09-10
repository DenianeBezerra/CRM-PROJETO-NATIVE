// T2.07 / CA-2-002 — conta com active=false falha na autenticação server-side.
//
// CRÍTICO (guia Skip §3.2): em auth request hooks, o token é escrito DENTRO de
// e.next(). Para REJEITAR um login, lançar erro explicitamente — um "return"
// seco responde 200 com corpo vazio a TODOS os logins (incluindo o superuser
// da plataforma) e derruba o acesso à instância.
//
// Mensagem GENÉRICA (idêntica ao falho de credenciais inválidas): o hook roda
// ANTES da validação da senha, e uma mensagem específica ("Conta inativa")
// permitiria enumerar quais e-mails têm conta no sistema.
//
// Padrão correto: rejeitar com throw; permitir com return e.next().

onRecordAuthWithPasswordRequest((e) => {
  if (e.record && e.record.get('active') === false) {
    throw new BadRequestError('Falha ao autenticar.')
  }
  return e.next()
}, 'users')

onRecordAuthRefreshRequest((e) => {
  if (e.record && e.record.get('active') === false) {
    throw new BadRequestError('Falha ao autenticar.')
  }
  return e.next()
}, 'users')
