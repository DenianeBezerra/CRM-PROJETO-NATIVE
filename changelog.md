# Changelog — CRM Vibratto

## [0.0.621] — 2026-09-13 — M-19 ampliado + pendências da CEO

- 2026-09-13 · [Deni.Ai] · **M-19 ampliado (CEO)**: busca global com 4 tipos em seções separadas — Empresas (nome/CNPJ), Contatos (nome/email/empresa), Oportunidades (título/campanha, com cliente/estágio/valor) e Conteúdos (título/tema/ROTEIRO — base da Visão 3). Provas por API ("split" → 2 conteúdos; "Felicidade" → empresa+contato+oportunidade; busca por trecho de roteiro → peça publicada; social_media 403; 401 sem auth) e no navegador real (dropdown com seção CONTEÚDOS e tags Prova). Tooltip no resultado de empresa ("página própria é pendência"). Pendência baixa: estender o componente às demais telas com header.

## [0.0.620] — 2026-09-13 — D23/D24 fechadas, Leva B autorizada

- 2026-09-13 · [Deni.Ai] · **D23 fechada**: ordenação por desempenho entra quando houver dado medido (D20); até lá, por data. **D24 fechada com correção de premissa**: a lista plana é substituída pela VISÃO 3 (busca e histórico), não pelo painel do dia — a lista permanece até a Visão 3 existir. **Leva B AUTORIZADA** (calendário → busca → anual). SPEC-3-021B atualizada.

## [0.0.615–0.618] — 2026-09-13 — M-19 busca global CONCLUÍDA

- 2026-09-13 · [Deni.Ai] · **M-19 — Busca global** concluída (provas por API + navegador real): endpoint GET /backend/v1/busca-global (contatos por nome/email/empresa + oportunidades por título/campanha; resolve nome da empresa da relação; mínimo 2 chars; 401 sem auth; 403 social_media) + componente BuscaGlobal no header da home (atalho "/", Ctrl+K, Esc, debounce 250ms, dropdown com seções, navegação por clique). Provas: "Felicidade" → 1 contato + 1 oportunidade (R$ 8.336,11, fechado_ganho); renderização confirmada no navegador. Ajuste: empresa omitida quando igual ao nome.

## [0.0.617] — 2026-09-13 — Peça Split payment publicada (validação ponta a ponta) + SPEC-3-021B

- 2026-09-13 · [Deni.Ai] · **Validação ponta a ponta do módulo de conteúdo**: peça real "Split payment no Simples: o que muda em 2026" criada pelo fluxo completo (ideia → pauta → roteiro → produção → edição → pronto p/ publicar → agendado → publicado; 8 transições na timeline com autor/data), campanha D17 automática 2026-cfo-split-payment (hífen puro, linha abreviada, tema curto), capa e arquivo final REAIS com upload, links rastreáveis 2/2, bloqueio provado (publicado sem url → 400), url_publicacao registrada, data_efetiva gravada. **SPEC-3-021B publicada** (3 visões da agenda editorial como pacote único; ordem: calendário → busca → anual). Nota da CEO: roteiro redigido por IA na validação — revisão editorial antes de publicar de verdade.

## [0.0.613–0.614] — 2026-09-13 — M-20 badge de ambiente + ErrorBoundary na raiz

- 2026-09-13 · [Deni.Ai] · **M-20**: badge "Ambiente de homologação" no rodapé da home (aparece só no preview/DEV; some na produção) — provado no navegador real. **ErrorBoundary na raiz (pedido da CEO)**: exceção na montagem de qualquer componente exibe mensagem de falha com identificação do erro + "Tentar novamente" + "Ir para a tela inicial" — tela preta sem explicação não é mais estado possível. Distinção registrada: fail-safe por fonte protege contra DADO que falha; ErrorBoundary protege contra EXCEÇÃO NA MONTAGEM do componente.

## [0.0.604–0.608] — 2026-09-13 — Retorno CEO v2.1 (divergência, B-22, A-24)

- 2026-09-13 · [Deni.Ai] · **Divergência exceção × atraso ESCLARECIDA**: as 3 exceções E1 apontavam obrigações CONCLUÍDAS em 12/09 16:09 sem passar pela rota de baixa (0 auditoria = conclusão direta no banco durante testes) → exceções ÓRFÃS; C-01 CORRETO (atraso por data = 0). Fix: migration 0199 resolveu as órfãs + fail-safe PERMANENTE no cron E1–E9 (resolve exceção aberta vinculada a obrigação concluída, com motivo_resolucao). **B-22**: cartão Contas & Empresas OCULTO (link provisório reintroduzia 2 cartões p/ mesmo destino). **A-24 executado com usuários de teste reais**: analista — coordenação/operacao-resumo 403 mas /relatorios 200 → ACHADO E CORRIGIDO (relatorios_agendados.js admin-only); social_media — totalItems=0 em comerciais, create 400 em negócios e conteúdos, /meu-dia 200, coordenação/relatórios 403. Usuários de teste removidos (0200/0201).

## [0.0.609–0.612] — 2026-09-13 — INCIDENTE home em branco RESOLVIDO

- 2026-09-13 · [Deni.Ai] · **INCIDENTE URGENTE (CEO)**: home PRETA no navegador real — hipótese de limitação do browser de automação CAIU. Causa raiz: patch v0.0.601 desestruturou `isAdmin` (inexistente no AuthContext) e PERDEU `isValid, isLoading, logout` → ReferenceError na montagem → React desmonta a árvore → tela preta. Fixes: useAuth restaurado (0.609); isAdmin derivado do role (0.610 — os 4 cartões admin voltaram); badge do Meu dia aceita formato {itens,total} da API (0.611). Provas no navegador real: 10 cartões, ordem correta, rodapé "Conexão segura", Contas & Empresas oculto, badge "1" no DOM com obrigação de prova (removida na 0202). **AP-2026-09-13-1130**: build/lint/testes NÃO capturam ReferenceError de desestruturação — a única prova válida de UI é RENDERIZAÇÃO CONFIRMADA NO NAVEGADOR; regra da CEO: nenhuma entrega concluída sem renderização confirmada; automação inconclusiva = sinalizar e aguardar.

## [0.0.601–0.603] — 2026-09-13 — Tela inicial v2.1 (Complemento 2.1)

- 2026-09-13 · [Deni.Ai] · **Tela inicial v2.1** (doc da CEO uploads/a53c6d70): B-21 rodapé "Conexão segura" (era "criptografada de ponta a ponta"); B-22 link no cartão Contas & Empresas (depois oculto por decisão da CEO); A-22 nomes únicos por destino (mapa rotulo); A-23 contadores de pendência nos cartões Meu dia e Operação do dia + Visão de coordenação (novo endpoint admin-only /backend/v1/visao/operacao-resumo; badge vermelho só quando >0); M-21 Meu dia e Operação do dia primeiro no grid; M-22 texto "central de gestão". Confirmados pela CEO: A-07 (implantação 7 etapas), A-09 (conclusão condicionada à ficha), Relatórios agendados.

## [0.0.595–0.599] — 2026-09-13 — T3.21 validação da CEO + ajustes de convenção

- 2026-09-13 · [Deni.Ai] · **Validação item a item (8 pontos)** respondida com código e base real: links da peça já existiam (imutabilidade) — o erro "Não foi possível gerar os links" era o caso "todos os canais já têm link" com toast genérico; peça arquivada era limpeza de prova; peça avulsa sem campanha não gerava identificador D17 → corrigido (POST /conteudos cria campanha mínima com slug D17 imutável). **Ajustes CEO**: Ajuste 1 — slug D17 com SÓ HÍFEN + linha abreviada (bpo, tesouraria, controladoria, cfo, consultoria, institucional); campanhas existentes corrigidas na 0197. Ajuste 2 — tema = assunto CURTO (máx 4 palavras, validado no create), não o título. Ajuste 3 — tag PROVA visível na UI (src/lib/prova.tsx) aplicada em /conteudos. **Padrão geral**: helper src/lib/erro.ts (msgErro extrai err.response.data.error) — OperacaoDia sem catch vazio; estender ao resto. Arquivado = estado terminal; links bloqueados em arquivado.

## [0.0.591–0.594] — 2026-09-13 — Pendência RBAC social_media RESOLVIDA

- 2026-09-13 · [Deni.Ai] · **Pendência RBAC era FALSO NEGATIVO de prova**: listRule que filtra tudo responde 200 com lista VAZIA (não 403) — comparar totalItems entre papéis. Prova funcional (migrations 0192/0193 criaram usuário social_media de prova): social_media vê 0 em comerciais/operacionais (admin 3 negócios/18 obrigações), vê conteudos; create 400 em ambos (createRule de conteudos bloqueia social_media por desenho — prestadora só lê). Limpeza 0194. **Lição**: coleção users tem regras self-only — criar/ajustar usuários via MIGRATION (padrão 0016); guard T2.07: login active=false dá mensagem genérica.
