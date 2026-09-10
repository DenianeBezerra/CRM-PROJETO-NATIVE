# Evidência — T2.06 — CA-2-001 (RED)

- **Data:** 2026-09-10
- **Versão de baseline:** 0.0.121 (QA verde, SPEC-2-000 fechada)
- **Método:** varredura por API + revisão do código-fonte.

## Provas

1. **Senhas fixas em texto no código-fonte** — migrations 0001/0004 (`Skip@Pass`, admin) e 0016 (`Operator@2026`, operator) gravam senhas literalmente; qualquer pessoa com acesso ao repositório conhece as credenciais.
2. **Senha real injetável pela UI** — botão "Preencher Demonstração" na tela de login (`Index.tsx`) preenchia `Skip@Pass` automaticamente no preview, acessível a qualquer visitante.
3. **Snapshots sem saneamento** — nada impedia que um registro futuro com campo sensível entrasse inteiro no snapshot da auditoria (risco latente; varredura atual = 0 reais; 5 ocorrências do termo "chave" são falso-positivo — campo de negócio de etapas, valor tipo "novo").
4. **Conforme**: `.env` só com URL pública; API de usuários não expõe passwordHash.

## Conclusão

CA-2-001 reproduz falha no baseline v0.0.121. Implementação autorizada pela cliente em 2026-09-10 18:51.
