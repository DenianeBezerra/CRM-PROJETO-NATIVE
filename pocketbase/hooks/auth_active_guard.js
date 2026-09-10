// T2.07 / CA-2-002 — conta com active=false falha na autenticação server-side.
//
// CRÍTICO (guia Skip §3.2): em auth request hooks, o token é escrito DENTRO de
// e.next(). Para REJEITAR um login, lançar erro explicitamente — um "return"
// seco responde 200 com corpo vazio a TODOS os logins (incluindo o superuser
// da plataforma) e derruba o acesso à instância.
//
// Padrão correto: rejeitar com throw; permitir com return e.next().

onRecordAuthWithPasswordRequest((e) => {
  if (e.record && e.record.get('active') === false) {
    throw new BadRequestError('Conta inativa. Procure o administrador.')
  }
  return e.next()
}, 'users')

onRecordAuthRefreshRequest((e) => {
  if (e.record && e.record.get('active') === false) {
    throw new BadRequestError('Conta inativa. Procure o administrador.')
  }
  return e.next()
}, 'users')
