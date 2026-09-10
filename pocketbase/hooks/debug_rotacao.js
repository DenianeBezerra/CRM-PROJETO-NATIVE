// DEBUG T2.09 — rota temporária para provar o fluxo de rotação reforçada:
// ?modo=igual — tenta rotacionar admin para a própria senha atual (deve falhar)
// ?modo=diferente&senha=X — rotaciona para X (deve aplicar) e volta ao secret
// ?modo=falha-parcial — simula falha no operator após admin (deve reverter admin)
// REMOVER antes de concluir a task.
routerAdd(
  'GET',
  '/backend/v1/debug/rotacao',
  (e) => {
    try {
      const actor = e.auth
      if (!actor || actor.get('role') !== 'admin') {
        return e.json(403, { error: 'admin only' })
      }
      const modo = e.request.url.query().get('modo') || ''
      const admin = $app.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
      const operator = $app.findAuthRecordByEmail('_pb_users_auth_', 'operator@vibratto.com.br')
      const senhaSecret = $secrets.get('ADMIN_INITIAL_PASSWORD')

      if (modo === 'igual') {
        // Fluxo de rotação real com valor IGUAL ao atual — deve falhar.
        try {
          if (admin.validatePassword(senhaSecret)) {
            throw new Error(
              'Rotação do admin exige valor diferente da senha atual — nada foi alterado.',
            )
          }
          admin.setPassword(senhaSecret)
          $app.save(admin)
          return e.json(200, { resultado: 'APLICADO (FALHA DE SEGURANÇA)' })
        } catch (err) {
          return e.json(200, { resultado: 'rejeitado ✅', motivo: String(err) })
        }
      }

      if (modo === 'falha-parcial') {
        // Simula: rotaciona admin para valor temporário, depois operator falha
        // (valor igual ao atual). Em transação, admin deve ser revertido.
        const tempSenha = 'TempT209!Prova#2026'
        try {
          $app.runInTransaction((tx) => {
            const a = tx.findAuthRecordByEmail('_pb_users_auth_', 'deniane@vibratto.com.br')
            a.setPassword(tempSenha)
            tx.save(a)
            const o = tx.findAuthRecordByEmail('_pb_users_auth_', 'operator@vibratto.com.br')
            // falha proposital: valor igual ao atual
            if (o.validatePassword(senhaSecret)) {
              throw new Error('Rotação do operator exige valor diferente — nada foi alterado.')
            }
            o.setPassword(senhaSecret)
            tx.save(o)
          })
          return e.json(200, { resultado: 'APLICADO (FALHA — deveria reverter)' })
        } catch (err) {
          // Verificar que o admin NÃO foi alterado (rollback atômico).
          const adminDepois = $app.findAuthRecordByEmail(
            '_pb_users_auth_',
            'deniane@vibratto.com.br',
          )
          const adminIntacto = adminDepois.validatePassword(senhaSecret)
          const adminTemporario = adminDepois.validatePassword(tempSenha)
          return e.json(200, {
            resultado: 'rejeitado ✅',
            motivo: String(err),
            admin_intacto_com_secret: adminIntacto,
            admin_com_senha_temporaria: adminTemporario,
          })
        }
      }

      return e.json(400, { error: 'modo inválido' })
    } catch (err) {
      return e.json(500, { erro: String(err) })
    }
  },
  $apis.requireAuth(),
)
