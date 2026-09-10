# Evidência — T2.07 — CA-2-002 (RED)

- **Data:** 2026-09-10
- **Versão de baseline:** 0.0.131 (QA verde, T2.06 concluída)
- **Método:** prova por API real.

## Provas

1. **Login sem preenchimento de senha** — ✅ parte já conforme (T2.06 removeu a senha fixa do botão de demonstração; zero ocorrências de senha fixa no frontend).
2. **Conta com active=false autentica** — criada fixture `inativo-t207@vibratto.com.br` com `active=false`: o login **obteve token válido** e a conta **leu 8 contatos**. O campo `active` existia na coleção, mas nada o validava na autenticação — uma conta desativada mantinha acesso pleno.

## Conclusão

CA-2-002 reproduz falha no baseline v0.0.131. Implementação autorizada pela cliente em 2026-09-10 19:06.
