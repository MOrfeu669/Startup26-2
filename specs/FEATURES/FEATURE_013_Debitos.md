# Feature 013: Débitos

**Status:** 🔴 A especificar (esqueleto — nenhuma regra de negócio definida ainda)
**Fase:** V1
**Complexidade:** ⚠️ PENDENTE
**Dependências:** Feature 012 (Plano de Tratamento) — demais ⚠️ PENDENTE

---

## Contexto

"Débitos" é uma seção do prontuário do paciente mencionada desde o levantamento inicial (Features 004 e 010), junto com o "Histórico de Pagamentos". O Plano de Tratamento (Feature 012) cobre o **orçamento** (procedimentos, dentes e valores) e o **faturamento** (contabilizado por item concluído). Esta feature cobre o que ainda não tem dono: **o que o paciente deve e o que ele já pagou**.

Esta spec foi criada em 2026-10-02 a partir da análise de consistência (`context/ANALISE_SPECS.md`, ESC-10), por decisão do Bernardo: feature própria, posicionada depois do Plano de Tratamento, na fase V1.

---

## Requisitos

- [stated] Feature própria para Débitos, posicionada logo após o Plano de Tratamento (Feature 012), na fase V1
- ⚠️ PENDENTE — demais requisitos a especificar com o usuário

---

## Cenários

⚠️ PENDENTE — nenhum cenário definido. Na fase de testes, esta feature não gera `it` até ser especificada.

---

## Exemplos de Código

⚠️ PENDENTE — nenhuma interface definida.

---

## Dependências

- Feature 012 (Plano de Tratamento) — origem do orçamento e do faturamento
- ⚠️ PENDENTE — confirmar se depende também de Feature 004 (paciente), Feature 006 (agendamento) e Feature 010 (prontuário)

---

## Regras de Negócio

- [stated] O faturamento é contabilizado por item do plano concluído (Feature 012); o pagamento efetivo é tratado nesta feature

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ O que gera um débito: cada item do plano concluído, o plano aprovado, ou um lançamento manual?
- ⚠️ Procedimento avulso concluído (fora do plano) também gera débito?
- ⚠️ Como se registra um pagamento (forma de pagamento, data, quem registra)?
- ⚠️ Existe parcelamento? Pagamento parcial? Desconto?
- ⚠️ Quais papéis podem ver/registrar débitos e pagamentos?
- ⚠️ Pagamentos aparecem no Dashboard (Feature 019) além do faturamento?
- ⚠️ Existe alerta de débito em atraso (Feature 018)?

---

## Notas

Seguindo a metodologia SDD, esta spec precisa passar pela rodada de perguntas ("questionar antes de assumir") antes de ir para migration/teste/código.
