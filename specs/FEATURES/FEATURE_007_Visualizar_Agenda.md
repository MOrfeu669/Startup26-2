# Feature 007: Visualizar Agenda

**Status:** 🟡 Em Definição
**Fase:** V1
**Complexidade:** 🟡 Média
**Dependências:** Feature 002, Feature 003, Feature 006

---

## Contexto

Depois de criar agendamentos (Feature 006), os usuários precisam visualizá-los organizados em um calendário, com possibilidade de filtrar por dentista e por cadeira — essencial para a recepcionista organizar o fluxo do dia e para o dentista ver sua própria agenda.

---

## Requisitos

- [ ] Exibir agendamentos em formato de calendário
- [ ] Alternar a visualização entre dia e semana durante o uso
- [ ] Filtrar por dentista
- [ ] Filtrar por cadeira
- [ ] Dentista vê a agenda completa da clínica (todos os dentistas), não apenas a própria
- [ ] Recepcionista vê a agenda de todos os dentistas
- [ ] Exibir o status de cada agendamento ("agendado", "em espera", "iniciado", "concluído")
- [ ] Refletir os bloqueios de agenda do dentista, inclusive recorrentes (Feature 006)
- [ ] Exibir alertas visuais (cor destacada ou sinal "!") para: cadeira desativada (Feature 002), dentista removido (Feature 003) e agendamento fora do novo horário de funcionamento (Feature 002)
- [ ] Atualização em tempo real, via Supabase Realtime

---

## Cenários

### Cenário 1: Ver agenda do dia
```
Dado agendamentos cadastrados para "2026-10-15"
Quando o usuário abre a agenda nessa data
Então vê todos os agendamentos do dia, com paciente, dentista, cadeira e status
```

### Cenário 2: Filtrar por dentista
```
Dado múltiplos dentistas com agendamentos no mesmo dia
Quando o usuário filtra pelo "Dr. Carlos"
Então vê apenas os agendamentos desse dentista
```

### Cenário 3: Filtrar por cadeira
```
Dado múltiplas cadeiras com agendamentos no mesmo dia
Quando o usuário filtra pela "Cadeira 2"
Então vê apenas os agendamentos marcados nessa cadeira
```

### Cenário 4: Visualizar status de presença
```
Dado um agendamento com status "em espera"
Quando o Dentista responsável (ou o Admin) marca o atendimento como "iniciado"
Então a agenda reflete a mudança de status em tempo real
```

### Cenário 5: Alternar entre visualização de dia e semana
```
Dado a agenda aberta em visualização de dia
Quando o usuário alterna para visualização de semana
Então a agenda passa a exibir os agendamentos da semana inteira, sem precisar recarregar a página
```

### Cenário 6: Dentista vê agenda completa da clínica
```
Dado múltiplos dentistas com agendamentos no mesmo dia
Quando um Dentista abre a agenda sem aplicar filtro
Então ele vê os agendamentos de todos os dentistas da clínica, não apenas os seus
```

### Cenário 7: Agendamento com cadeira desativada exibe alerta
```
Dado um agendamento futuro vinculado a uma cadeira que foi desativada (Feature 002)
Quando o usuário visualiza a agenda
Então esse agendamento aparece destacado com sinal de alerta "!"
```

---

## Exemplos de Código

```typescript
interface FiltroAgenda {
  clinica_id: string;
  visualizacao: 'dia' | 'semana';
  data_inicio: string;
  data_fim: string;
  dentista_id?: string; // sem filtro = mostra todos os dentistas
  cadeira_id?: string;
}

// Exemplo de uso esperado
const agendamentos = await agendaService.listar({
  clinica_id: 'clinica-001',
  visualizacao: 'dia',
  data_inicio: '2026-10-15',
  data_fim: '2026-10-15',
  dentista_id: 'dentista-005'
});
```

---

## Dependências

- Feature 002 (Criar/Configurar Clínica) — cadeiras disponíveis para filtro
- Feature 003 (Cadastro de Dentistas) — dentistas disponíveis para filtro
- Feature 006 (Criar Agendamento) — dados exibidos na agenda

---

## Regras de Negócio

- [stated] Visualização em calendário
- [stated] Filtro por dentista e por cadeira
- [correção] Visualização alterna entre dia e semana durante o uso
- [correção] Dentista e Recepcionista veem a agenda completa da clínica (todos os dentistas), não uma visão restrita
- [correção] Atualização em tempo real
- [stated] Tempo real implementado com Supabase Realtime
- [correção] Agendamentos com cadeira desativada, dentista removido ou fora do novo horário de funcionamento exibem alerta visual (cor destacada ou sinal "!")

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Existe visualização por mês, além de dia e semana?
- ⚠️ Agendamentos com status "cancelado" aparecem na agenda (por exemplo, riscados) ou são ocultados?

---

## Notas

Feature majoritariamente de leitura/visualização — depende inteiramente dos dados já criados nas Features 002, 003 e 006.

**Histórico:** 2026-10-02 — aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: INC-01, ESC-03, ESC-09, REF-02).
