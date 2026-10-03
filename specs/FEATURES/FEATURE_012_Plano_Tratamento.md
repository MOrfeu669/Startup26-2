# Feature 012: Plano de Tratamento

**Status:** 🟡 Em Definição
**Fase:** V1
**Complexidade:** 🟡 Média
**Dependências:** Feature 004, Feature 005, Feature 006, Feature 010, Feature 011

---

## Contexto

Esta feature nasceu de um gap identificado na Feature 019 (Dashboard): os dados financeiros exibidos no Dashboard precisam de uma origem, e essa origem é o Plano de Tratamento. É aqui que o Dentista seleciona, para um paciente específico, quais procedimentos serão realizados, em quais dentes e quanto cada um vai custar — formando a base de orçamento e faturamento da clínica.

A cadeia do modelo é: **Plano de Tratamento → itens (procedimento + dentes) → materiais do procedimento** (Feature 005).

---

## Requisitos

- [ ] Dentista cria um Plano de Tratamento para um paciente, com um ou mais itens
- [ ] Cada item do plano tem: um procedimento (Feature 005), **um ou mais dentes (obrigatório, numeração FDI, Feature 011)** e o valor que será cobrado (pode partir do valor médio do procedimento, mas é ajustável)
- [ ] Item do plano pode ser vinculado a um agendamento (Feature 006) em que será executado
- [ ] Ao concluir o agendamento (salvar a Evolução, Feature 010), os itens executados nele passam a `concluido`, registrando o dentista que os executou
- [ ] Plano de Tratamento fica vinculado ao prontuário do paciente (Feature 010)
- [ ] Plano de Tratamento tem um status que acompanha sua execução (ex: proposto, em andamento, concluído)
- [ ] Valor total do Plano de Tratamento é a soma dos valores definidos para cada item
- [ ] O faturamento do Dashboard (Feature 019) é contabilizado **por item concluído**, na data da conclusão, e atribuído ao **dentista que executou** o item

---

## Cenários

### Cenário 1: Criar plano de tratamento com múltiplos procedimentos
```
Dado um paciente com prontuário existente
Quando o Dentista cria um Plano de Tratamento com os itens "Restauração" no dente 26 (R$ 150) e "Restauração" no dente 16 (R$ 80)
Então o sistema salva o plano com valor total de R$ 230
```

### Cenário 2: Ajustar valor de um procedimento no plano
```
Dado um Plano de Tratamento com o item "Restauração" no valor médio de R$ 150
Quando o Dentista ajusta esse valor para R$ 180 para esse paciente específico
Então o sistema salva o valor customizado, sem alterar o valor médio padrão do procedimento (Feature 005)
```

### Cenário 3: Itens concluídos alimentam o faturamento do Dashboard
```
Dado itens de planos de tratamento concluídos no mês (agendamentos concluídos), somando R$ 5.000
Quando o Admin abre o Dashboard (Feature 019)
Então vê o faturamento do período refletindo esse valor
E cada valor aparece atribuído ao dentista que executou o item
```

### Cenário 4: Acompanhar status do plano de tratamento
```
Dado um Plano de Tratamento com status "proposto"
Quando os itens vinculados começam a ser realizados em agendamentos (Feature 006)
Então o Dentista pode atualizar o status do plano para "em andamento"
```

### Cenário 5: Item do plano sem dente é bloqueado
```
Dado um Dentista criando um Plano de Tratamento
Quando ele adiciona um item sem informar nenhum dente
Então o sistema bloqueia e exige pelo menos um dente para o item
```

---

## Exemplos de Código

```typescript
interface PlanoTratamento {
  id: string;
  paciente_id: string;
  clinica_id: string;
  criado_por: string; // usuario_id
  status: 'proposto' | 'em_andamento' | 'concluido';
  itens: ItemPlano[];
  valor_total: number; // soma dos valores dos itens
  criado_em: string;
}

interface ItemPlano {
  id: string;
  procedimento_id: string; // referência à Feature 005 (materiais vêm do procedimento)
  dentes: number[]; // obrigatório, pelo menos 1 — numeração FDI (Feature 011)
  valor: number; // pode partir do valor médio do procedimento, mas é ajustável
  agendamento_id?: string; // agendamento em que será/foi executado (Feature 006)
  status: 'pendente' | 'concluido';
  executado_por?: string; // dentista que executou — base do faturamento por dentista
  concluido_em?: string; // data usada no faturamento
}

// Exemplo de uso esperado
const plano = await planoTratamentoService.criar({
  paciente_id: 'paciente-001',
  criado_por: 'dentista-005',
  itens: [
    { procedimento_id: 'procedimento-restauracao', dentes: [26], valor: 150.00 },
    { procedimento_id: 'procedimento-restauracao', dentes: [16], valor: 80.00 }
  ]
});
```

---

## Dependências

- Feature 004 (Cadastro de Pacientes) — plano é vinculado a um paciente
- Feature 005 (Criar Procedimento) — procedimentos selecionáveis no plano
- Feature 006 (Criar Agendamento) — itens do plano são executados em agendamentos
- Feature 010 (Prontuário Básico) — plano fica vinculado ao prontuário; a conclusão do atendimento marca os itens executados
- Feature 011 (Odontograma) — numeração FDI dos dentes dos itens

---

## Regras de Negócio

- [stated] Dentista seleciona quais procedimentos serão realizados e quanto cada um vai custar
- [stated] Esses dados alimentam o Financeiro do Dashboard (Feature 019)
- [stated] O plano é vinculado aos dentes: cada item tem procedimento + um ou mais dentes (obrigatório); cada procedimento tem N materiais (Feature 005)
- [stated] O faturamento é contabilizado por item concluído (agendamento concluído), na data da conclusão
- [stated] O faturamento por dentista é atribuído a quem executou o item
- [stated] Débitos e pagamentos são tratados na Feature 013 (Débitos)

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Quem pode criar/editar um Plano de Tratamento — apenas o Dentista (e o Admin, pela hierarquia), ou também a Recepcionista?
- ⚠️ Um plano pode ser editado depois de já ter itens concluídos, ou fica congelado a partir desse ponto?
- ⚠️ O status do plano passa a "concluido" automaticamente quando todos os itens são concluídos, ou é sempre manual?

---

## Notas

Esta feature preenche o gap estrutural identificado na Feature 019: sem ela, o Dashboard não teria uma fonte de dados financeiros consistente. O registro de pagamentos efetivos fica com a Feature 013 (Débitos).

**Histórico:** 2026-10-02 — aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: PEN-03, INC-05, INC-12, ESC-10). Adicionado o Cenário 5. A pendência "quando o faturamento é contabilizado" foi resolvida.
