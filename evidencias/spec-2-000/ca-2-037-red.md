# Evidência T2.02 — RED (CA-2-037)

- Task: T2.02 — CA-2-037 (empresa como entidade relacional própria ou decisão registrada)
- SPEC: SPEC-2-000
- Data: 2026-09-10
- Projeto Skip: CRM_VIBRATTO (id 53851), baseline v0.0.92
- Decisão de modelagem: **Opção A — entidade relacional própria**, aprovada pela cliente/consultora em 2026-09-10 17:37 ("Aprovar Opção A — implementar entidade relacional").

## Lacuna demonstrada (inspeção do schema em vigor v0.0.92)

- `clientes.empresa` é **campo de texto livre** (max 200) — a mesma empresa é digitada à mão em cada contato ("Nexus Tecnologia & Cloud" repetido em 2+ contatos do seed).
- **Não existe** coleção `empresas` no schema (coleções: users, clientes, negocios, interacoes, demo_fixtures, fixture_audit, etapas_negocio, auditoria, aceites_exportacao, permanencias_negocio, configuracoes_operacionais).
- `negocios.cliente` aponta para `clientes`; não há agregação por empresa.
- A tela de Contatos usa input de texto para empresa; a busca trata empresa como texto.

## Comportamento atual (falha reproduzível)

- Dois contatos da mesma empresa podem ter textos diferentes ("Nexus Tecnologia", "Nexus Tecnologia & Cloud") sem qualquer consistência ou alerta — não há entidade para validar.
- Relatórios/diagnóstico/dashboard por empresa (restante da Fase 2) não têm base relacional.

## Conclusão

RED confirmado: sem a entidade `empresas`, o dado de empresa é fragmentado e não auditável. A correção (migration 0022 + telas) transforma `clientes.empresa` em relation com backfill dos textos existentes.
