# Feature 002: Criar/Configurar Clínica

**Status:** 🟡 Em Definição
**Fase:** MVP
**Complexidade:** 🟡 Média
**Dependências:** Feature 001 (Autenticação & Roles)

---

## Contexto

Antes de qualquer agendamento existir, a clínica precisa ser criada e configurada pelo Admin: horário de funcionamento e cadeiras disponíveis. Essas configurações servem de base para a Feature 006 (Criar Agendamento), que valida disponibilidade de horário e cadeira.

---

## Requisitos

- [ ] Admin cria a clínica (nome + dados básicos)
- [ ] Admin define um horário de funcionamento único e fixo (mesmo horário de abertura/fechamento em todos os dias em que a clínica atende), configurável nas configurações da clínica
- [ ] Admin seleciona quais dias da semana a clínica atende (incluindo fins de semana/feriados, conforme preferência de cada clínica)
- [ ] Admin cadastra cadeiras (quantidade inicial, podendo adicionar mais depois)
- [ ] Cadeiras não têm restrição de quais procedimentos podem ser realizados nelas
- [ ] Admin pode desativar uma cadeira (torná-la indisponível); agendamentos futuros já marcados nessa cadeira passam a exibir um aviso e ficam destacados na agenda (cor diferente ou sinal "!")
- [ ] Ao alterar o horário de funcionamento, agendamentos futuros que ficam fora do novo horário exibem aviso "fora de horário" (não são cancelados automaticamente)
- [ ] Configurações ficam vinculadas à clínica (multi-tenant, conforme Feature 001)
- [ ] Cada conta Admin gerencia apenas uma clínica

---

## Cenários

### Cenário 1: Criar clínica com horário padrão
```
Dado um Admin autenticado sem clínica configurada
Quando ele cria a clínica sem alterar o horário sugerido
Então a clínica é criada com horário padrão 08:00-18:00, aplicado igualmente a todos os dias em que atende
```

### Cenário 2: Definir dias de atendimento (incluindo fim de semana)
```
Dado um Admin autenticado criando a clínica
Quando ele seleciona segunda a sábado como dias de atendimento, com horário 08:00-18:00
Então a clínica salva esse horário único aplicado a todos os dias selecionados
```

### Cenário 3: Adicionar cadeiras na criação
```
Dado um Admin criando a clínica
Quando ele informa 3 cadeiras
Então o sistema cria 3 cadeiras vinculadas à clínica, sem nenhuma restrição de procedimento
```

### Cenário 4: Adicionar cadeira depois da criação
```
Dado uma clínica já criada com 3 cadeiras
Quando o Admin adiciona uma nova cadeira
Então a clínica passa a ter 4 cadeiras disponíveis para agendamento
```

### Cenário 5: Desativar cadeira com agendamentos futuros
```
Dado a "Cadeira 2" com agendamentos futuros com status "agendado"
Quando o Admin desativa essa cadeira
Então os agendamentos futuros vinculados a ela passam a exibir aviso de alerta
E aparecem destacados na Agenda (Feature 007) com cor diferente ou sinal "!"
E a cadeira deixa de aceitar novos agendamentos (Feature 006)
```
> No MVP, testa-se a marcação de alerta nos agendamentos e o bloqueio de novos agendamentos; o destaque visual na Agenda (Feature 007, V1) fica como `it.todo`.

### Cenário 6: Alterar horário de funcionamento com agendamentos fora do novo horário
```
Dado uma clínica com horário 08:00-18:00 e um agendamento com status "agendado" às 17:30
Quando o Admin altera o horário de funcionamento para 08:00-17:00
Então o agendamento das 17:30 passa a exibir o aviso "fora de horário"
E o agendamento NÃO é cancelado automaticamente
```

---

## Exemplos de Código

```typescript
interface Clinica {
  id: string;
  nome: string;
  admin_id: string; // um Admin gerencia exatamente uma clínica
  dias_atendimento: ('segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo')[];
  horario_abertura: string; // "08:00" — aplicado a todos os dias de atendimento
  horario_fechamento: string; // "18:00"
  cadeiras: Cadeira[];
}

interface Cadeira {
  id: string;
  clinica_id: string;
  identificacao: string; // ex: "Cadeira 1"
  ativa: boolean; // desativada = indisponível para novos agendamentos, gera alerta nos futuros já marcados
}

// Exemplo de uso esperado
const clinica = await clinicaService.criar({
  nome: 'Clínica OdontoSmile',
  admin_id: 'user-001',
  dias_atendimento: ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
  horario_abertura: '08:00',
  horario_fechamento: '18:00',
  cadeiras: 3
});
```

---

## Dependências

- Feature 001 (Autenticação & Roles) — precisa de um Admin autenticado para criar/configurar a clínica

---

## Regras de Negócio

- [stated] Horário de atendimento é configurável, com padrão 08:00-18:00
- [stated] Cadeiras podem ser definidas na criação da clínica e outras incluídas posteriormente
- [stated] Dentista pode utilizar qualquer cadeira disponível (não é vinculado a uma cadeira fixa)
- [stated] Dois dentistas não podem atender na mesma cadeira no mesmo horário (regra aplicada no agendamento, Feature 006, mas depende da existência das cadeiras definida aqui)
- [correção] Horário de funcionamento é único e fixo, aplicado igualmente a todos os dias em que a clínica atende (não varia por dia da semana)
- [correção] Dias de atendimento (incluindo fins de semana/feriados) são configuráveis conforme a preferência de cada clínica
- [correção] Cadeira pode ser desativada; agendamentos futuros nela exibem alerta e ficam destacados na Agenda (Feature 007)
- [correção] Alterar o horário de funcionamento não cancela agendamentos existentes fora do novo horário — eles passam a exibir aviso "fora de horário"
- [correção] Cada conta Admin gerencia exatamente uma clínica
- [correção] Cadeiras não têm restrição de quais procedimentos podem ser realizados nelas
- [stated] Cadeira desativada e dia fora de `dias_atendimento` bloqueiam novos agendamentos (validação aplicada na Feature 006; emergência retroativa ignora)

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Existe algum feriado nacional pré-configurado automaticamente, ou a clínica marca manualmente os dias que não atende?

---

## Notas

**Histórico:** 2026-10-02 — aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: INC-01, ESC-04, ESC-05).
