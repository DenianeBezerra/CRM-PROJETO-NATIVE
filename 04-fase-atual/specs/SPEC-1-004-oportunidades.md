# SPEC-1-004 — Oportunidades e campos comerciais

## Objetivo

Permitir que usuários autenticados registrem e mantenham oportunidades comerciais vinculadas a um contato, com valor, estágio, probabilidade, previsão de fechamento e observações.

## Escopo T4.1

- Rota protegida `/oportunidades`.
- Listagem, busca, criação e edição de oportunidades.
- Campos: título obrigatório; contato obrigatório; valor; estágio; probabilidade; data prevista de fechamento; observações.
- Estágios iniciais: novo, contato_feito, proposta, fechado_ganho, fechado_perdido.
- Persistência na coleção `negocios` existente.
- Usuários autenticados podem listar/criar/editar; exclusão permanece restrita a admin no backend.

## Critérios de aceite

- CA-1: usuário autenticado acessa `/oportunidades`; usuário sem sessão é redirecionado ao login.
- CA-2: não permite salvar sem título ou contato.
- CA-3: permite criar oportunidade com os campos comerciais e exibe o registro na listagem.
- CA-4: permite editar oportunidade sem perder os dados existentes.
- CA-5: permite buscar por título ou contato.
- CA-6: rejeita valor e probabilidade inválidos; probabilidade deve ficar entre 0 e 100.
- CA-7: operador não recebe fluxo de exclusão na interface e o backend mantém delete admin-only.

## Evidências

- QA Skip da versão de implementação.
- Teste humano no preview cobrindo CA-1 a CA-7.

## Fora do escopo

Kanban, histórico de interações, ganho/perda avançado, auditoria, exportação e automações.
