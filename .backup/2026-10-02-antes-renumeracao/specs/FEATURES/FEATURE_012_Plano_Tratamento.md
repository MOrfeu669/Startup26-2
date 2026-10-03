# Feature 012: Plano de Tratamento

**Status:** 🟡 Em Definição
**Fase:** V1
**Complexidade:** 🟡 Média
**Dependências:** Feature 004, Feature 005, Feature 010

---

## Contexto

Esta feature nasceu de um gap identificado na Feature 018 (Dashboard): os dados financeiros exibidos no Dashboard precisam de uma origem, e essa origem é o Plano de Tratamento. É aqui que o Dentista seleciona, para um paciente específico, quais procedimentos serão realizados e quanto cada um vai custar — formando a base de orçamento e faturamento da clínica.

---

## Requisitos

- [ ] Dentista cria um Plano de Tratamento para um paciente, selecionando um ou mais procedimentos (Feature 005)
- [ ] Para cada procedimento selecionado, o Dentista define o valor que será cobrado (pode partir do valor médio do procedimento, mas é ajustável)
- [ ] Plano de Tratamento fica vinculado ao prontuário do paciente (Feature 010)
- [ ] Plano de Tratamento tem um status que acompanha sua execução (ex: proposto, em andamento, concluído)
- [ ] Valor total do Plano de Tratamento é a soma dos valores definidos para cada procedimento selecionado
- [ ] Dados financeiros do Dashboard (Feature 018) são calculados a partir dos Planos de Tratamento das clínicas

---

## Cenários

### Cenário 1: Criar plano de tratamento com múltiplos procedimentos
```
Dado um paciente com prontuário existente
Quando o Dentista cria um Plano de Tratamento selecionando os procedimentos "Restauração" (R$ 150) e "Limpeza" (R$ 80)
Então o sistema salva o plano com valor total de R$ 230
```

### Cenário 2: Ajustar valor de um procedimento no plano
```
Dado um Plano de Tratamento com o procedimento "Restauração" no valor médio de R$ 150
Quando o Dentista ajusta esse valor para R$ 180 para esse paciente específico
Então o sistema salva o valor customizado, sem alterar o valor médio padrão do procedimento (Feature 005)
```

### Cenário 3: Plano de tratamento alimenta o faturamento do Dashboard
```
Dado planos de tratamento concluídos no mês, somando R$ 5.000
Quando o Admin abre o Dashboard (Feature 018)
Então vê o faturamento do período refletindo esse valor
```

### Cenário 4: Acompanhar status do plano de tratamento
```
Dado um Plano de Tratamento com status "proposto"
Quando os procedimentos vinculados começam a ser realizados em agendamentos (Feature 006)
Então o Dentista pode atualizar o status do plano para "em andamento"
```

---

## Exemplos de Código

```typescript
interface PlanoTratamento {
  id: string;
  paciente_id: string;
  clinica_id: string;
  criado_por: string; // dentista_id
  status: 'proposto' | 'em_andamento' | 'concluido';
  procedimentos: ProcedimentoDoPlano[];
  valor_total: number; // soma dos valores dos procedimentos
  criado_em: string;
}

interface ProcedimentoDoPlano {
  procedimento_id: string; // referência à Feature 005
  valor: number; // pode partir do valor médio do procedimento, mas é ajustável
  dente?: number; // referência opcional ao odontograma (Feature 011)
}

// Exemplo de uso esperado
const plano = await planoTratamentoService.criar({
  paciente_id: 'paciente-001',
  criado_por: 'dentista-005',
  procedimentos: [
    { procedimento_id: 'procedimento-restauracao', valor: 150.00 },
    { procedimento_id: 'procedimento-limpeza', valor: 80.00 }
  ]
});
```

---

## Dependências

- Feature 004 (Cadastro de Pacientes) — plano é vinculado a um paciente
- Feature 005 (Criar Procedimento) — procedimentos selecionáveis no plano
- Feature 010 (Prontuário Básico) — plano fica vinculado ao prontuário

---

## Regras de Negócio

- [stated] Dentista seleciona quais procedimentos serão realizados e quanto cada um vai custar
- [stated] Esses dados alimentam o Financeiro do Dashboard (Feature 018)

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Quem pode criar/editar um Plano de Tratamento — apenas o Dentista, ou também Admin/Recepcionista?
- ⚠️ O faturamento no Dashboard é contabilizado quando o plano é criado, quando os procedimentos são efetivamente concluídos, ou quando o pagamento é registrado?
- ⚠️ Existe débito/pagamento formal vinculado ao Plano de Tratamento (relacionado ao gap de "Débitos e Histórico de Pagamentos" mencionado no prontuário)?
- ⚠️ Um plano pode ser editado depois de já ter procedimentos concluídos, ou fica congelado a partir desse ponto?

---

## Notas

Esta feature preenche o gap estrutural identificado na Feature 018: sem ela, o Dashboard não teria uma fonte de dados financeiros consistente. Ainda existe uma pendência maior conectada a esta spec: o fluxo completo de Débitos e Histórico de Pagamentos (mencionado desde o levantamento inicial do prontuário) não está totalmente especificado — este Plano de Tratamento resolve a parte de "orçamento", mas o registro de pagamentos efetivos pode precisar de detalhamento adicional.
