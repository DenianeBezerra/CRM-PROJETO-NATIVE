# Debug — 2026-09-10 — T2.01 roteiro de teste incorreto

**Task e problema:** T2.01 — cliente relatou "o caminho indicado não parece certo" ao seguir o roteiro de teste humano.

**Reprodução:** Navegação real no preview: login → home. A home não possui botão/link para a tela de Oportunidades (só "Abrir contatos" e "Painel operacional"); o roteiro também não informava as credenciais.

**Causa raiz:** Falha do roteiro de teste (comunicação), não do produto. A tela `/oportunidades` existe e funciona; falta apenas atalho de navegação na home (fora do escopo da T2.01).

**Correção:** Roteiro corrigido (URL direta `/oportunidades` + credenciais) e teste repetido ponta a ponta pelo champion via navegador: registro "Teste humano T2.01" criado pela UI com os 8 campos, persistido e recarregado corretamente na edição.

**Verificação automática:** QA v0.0.90/v0.0.91 verde; provas por API revalidadas (score 150 → 400; status divergente → 400; campos persistem; movimentação de estágio → 200).

**Gate atual:** teste humano aprovado pela cliente ("validado, agora sim!"); task concluída.

**Nota para backlog (não é desta task):** avaliar link "Oportunidades" na home (navegação) em task futura de UX.
