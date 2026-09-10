# AP-2026-09-10 — Migration queimada por geração automática + funções top-level no JSVM

- **Task:** T2.01 (CA-2-036)
- **Padrão 1 — prefixo de migration queimado:** ao gravar um arquivo de migration com campo `select` de `maxSelect: 10` (acima do limite da plataforma), o Skip gerou automaticamente uma versão com erro, consumiu o prefixo 0019 e aplicou parcialmente; a reescrita com o mesmo prefixo não reaplica. **Regra:** numerar a migration seguinte (0021) e registrar o prefixo perdido; conferir `skip_cloud_list_migrations` antes e depois do apply.
- **Padrão 2 — funções/constantes top-level em hooks:** o runtime goja não resolve referências do escopo superior dentro de callbacks (compila, falha em runtime com "file not found on pod" no QA de integrações). **Regra:** toda constante e auxiliar duplicada inline dentro de cada callback; um hook por arquivo.
- **Padrão 3 — ator no delete:** model hook `onRecordDelete` não tem `e.auth` (contexto HTTP). **Regra:** auditoria de exclusão em `onRecordDeleteRequest`, que possui `e.auth`, gravando o evento após `e.next()`.
- **Evidência:** QA v0.0.86 (integrations falhou) → correção → v0.0.87–v0.0.91 verde; provas por API e UI em `evidencias/spec-2-000/`.
