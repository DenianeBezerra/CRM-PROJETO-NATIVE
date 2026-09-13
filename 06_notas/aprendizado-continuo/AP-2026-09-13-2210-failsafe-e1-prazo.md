# AP-2026-09-13-2210 — E1 fail-safe: exceção não dispara antes do prazo de resposta da ficha

- Status: candidato
- Escopo: projeto do cliente (CRM Vibratto)
- Task/SPEC: T3.14 / SPEC-3-014 (CA-3-048)
- Sinal: no teste humano, etapa "enviada" marcada em obrigação real e avaliador executado — E1 (autorizacao_pendente) NÃO criou exceção porque prazo_resposta_horas=48h da ficha ainda não venceu. Comportamento correto (fail-safe), não falha.
- Evidência: POST /excecoes/avaliar → {"excecoes_criadas":0}; exceções abertas permaneceram 3 (só obrigacao_atrasada reais).
- Regra reutilizável: gatilhos de exceção baseados em prazo só disparam quando o prazo configurado na ficha operacional vence — no teste, validar o disparo com fixture de etapa_em retroativo ou prazo curto, nunca esperar "exceção imediata" como sinal de sucesso.
- Quando aplicar: testes das exceções E1–E9 e futuras regras dependentes de prazo da ficha.
- Quando não aplicar: exceções por estado imediato (ex.: obrigação atrasada por data vencida).
- Confiança: alta — provado por API com estado real preservado.
- Privacidade: sem segredo, dado pessoal ou conteúdo bruto.
