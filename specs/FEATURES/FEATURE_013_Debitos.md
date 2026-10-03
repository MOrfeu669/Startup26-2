# Feature 013: Débitos

**Status:** 🟡 Em Definição
**Fase:** V1
**Complexidade:** 🟡 Média
**Dependências:** Feature 004, Feature 005, Feature 006, Feature 010, Feature 012

---

## Contexto

"Débitos" é uma seção do prontuário do paciente. O Plano de Tratamento (Feature 012) cobre o orçamento e o faturamento por item concluído. Esta feature cobre o que o paciente deve e o pagamento que quita esse débito.

O débito nasce quando o atendimento é concluído (salvar a Evolução, Feature 010): um por item do plano concluído, e um pelo procedimento avulso concluído.

---

## Requisitos

- [ ] Feature própria, depois do Plano de Tratamento (Feature 012), na fase V1
- [ ] Cada item do plano concluído gera um débito no valor daquele item
- [ ] Procedimento avulso concluído gera um débito pelo valor médio do procedimento (Feature 005)
- [ ] Não há lançamento manual de débito
- [ ] O Admin registra um pagamento que quita o débito, com forma de pagamento, data e o usuário que registrou
- [ ] Não há pagamento parcial nem parcelamento
- [ ] Dentista e Recepcionista veem os débitos e os pagamentos do paciente; não registram pagamento
- [ ] Débito e pagamento ficam no prontuário do paciente (Feature 004 / 010) e não são apagados

---

## Cenários

### Cenário 1: Item do plano concluído gera débito
```
Dado um item do plano do paciente, com valor definido, ainda sem débito
Quando esse item é concluído (a Evolução do atendimento é salva, Feature 010)
Então o sistema cria um débito desse paciente no valor do item
```

### Cenário 2: Procedimento avulso concluído gera débito
```
Dado um agendamento com procedimento avulso, sem itens de plano
Quando o atendimento é concluído
Então o sistema cria um débito no valor médio desse procedimento
```

### Cenário 3: Admin quita o débito com um pagamento
```
Dado um débito em aberto
Quando o Admin registra o pagamento, informando a forma e a data
Então o débito fica quitado
E o registro guarda a forma, a data e quem registrou
```

### Cenário 4: Dentista e Recepcionista não registram pagamento
```
Dado um débito em aberto visível para o Dentista e para a Recepcionista
Quando um deles tenta registrar o pagamento
Então o sistema bloqueia com "Ação não permitida para seu papel"
E os dois continuam vendo o débito
```

---

## Exemplos de Código

```typescript
interface Debito {
  id: string;
  clinica_id: string;
  paciente_id: string;
  origem: 'item_plano' | 'procedimento_avulso';
  item_plano_id?: string;
  agendamento_id?: string;
  valor: number;
  status: 'em_aberto' | 'quitado';
  pagamento?: Pagamento;
}

interface Pagamento {
  id: string;
  debito_id: string;
  forma: string; // lista fechada de formas: ⚠️ PENDENTE
  data: string;
  registrado_por: string; // usuario_id do Admin
}

const debito = await debitoService.registrarPagamento(debitoId, {
  forma: 'pix',
  data: '2026-10-20',
});
```

---

## Dependências

- Feature 004 (Paciente) — o débito é do paciente
- Feature 012 (Plano de Tratamento) — valor do item concluído
- Feature 005 (Procedimento) — valor médio do avulso
- Feature 006 (Agendamento) — procedimento avulso do atendimento
- Feature 010 (Prontuário) — salvar a Evolução é o que conclui e dispara o débito

---

## Regras de Negócio

- [stated] O faturamento é contabilizado por item do plano concluído (Feature 012); o pagamento efetivo é tratado nesta feature
- [stated] 2026-10-03 — cada item do plano concluído gera um débito no valor do item. Não nasce do plano aprovado nem de lançamento manual
- [stated] 2026-10-03 — procedimento avulso concluído gera débito pelo valor médio do procedimento
- [stated] 2026-10-03 — um pagamento, registrado pelo Admin, quita o débito. O registro tem forma, data e quem registrou. Não há pagamento parcial nem parcelamento
- [stated] 2026-10-03 — Dentista e Recepcionista só veem; só o Admin registra pagamento

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Lista fechada de formas de pagamento (dinheiro, PIX, cartão, convênio, …)
- ⚠️ Existe desconto sobre o débito?
- ⚠️ Pagamentos aparecem no Dashboard (Feature 019) além do faturamento?
- ⚠️ Existe alerta de débito em atraso (Feature 018)?

---

## Notas

**Histórico:** 2026-10-02 — spec criada como esqueleto (`context/ANALISE_SPECS.md`, ESC-10). 2026-10-03 — Bernardo definiu origem do débito, quitação à vista pelo Admin e visibilidade dos demais papéis. A implementação continua bloqueada pelos pendentes acima e pelas features 010 e 012.
