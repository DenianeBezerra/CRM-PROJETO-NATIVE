# AP-2026-09-13-2312 — Drift entre STATUS.md e fase.md (linhas de levas sumiram da tabela)

- Status: candidato
- Escopo: projeto do cliente
- Task/SPEC: T3.16 (SPEC-3-016); governança da Fase 3
- Sinal: na conclusão da T3.16, a tabela da Fase 3 em `04-fase-atual/fase.md` estava sem as linhas das levas 8–12 (T3.08, T3.09, T3.10, T3.11, T3.12) — todas concluídas e presentes no STATUS.md — e a linha da T3.16 ainda constava como "Aguardando autorização" apesar de implementada (v0.0.541) e testada. O cabeçalho dizia "15 tasks" com apenas 12 linhas na tabela.
- Evidência: leitura do fase.md no working tree Skip em 2026-09-13 23:00 (T3.08–T3.11 com 0 ocorrências; T3.16 com status desatualizado) vs STATUS.md com 16 levás listadas.
- Regra reutilizável: ao concluir cada task, atualizar fase.md E STATUS.md na MESMA edição e conferir que o número de linhas da tabela da fase ativa bate com a contagem do cabeçalho e do STATUS — drift entre os dois arquivos indica edição parcial anterior.
- Quando aplicar: todo fechamento de task com atualização de governança; qualquer reconciliação de estado.
- Quando não aplicar: não reescrever histórico — apenas restaurar linhas ausentes com o conteúdo canônico do STATUS/changelog (regra aditiva da CEO).
- Confiança: alta — verificado por contagem de ocorrências no arquivo real.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
