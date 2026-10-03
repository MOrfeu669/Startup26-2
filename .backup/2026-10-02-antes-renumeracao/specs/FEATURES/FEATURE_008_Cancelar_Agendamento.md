# Feature 008: Cancelar Agendamento

**Status:** 🟡 Em Definição
**Fase:** V1
**Complexidade:** 🟡 Média
**Dependências:** Feature 006, Feature 017

---

## Contexto

Consultas marcadas podem precisar ser canceladas por qualquer um dos três papéis. É obrigatório registrar o motivo, e a recepcionista precisa ser avisada internamente para comunicar o paciente (já que o paciente não tem acesso direto ao sistema — confirmado na Feature 001/004).

---

## Requisitos

- [ ] Admin, Dentista e Recepcionista podem cancelar um agendamento
- [ ] Cancelamento exige motivo escrito
- [ ] Ao cancelar, sistema dispara notificação interna para a Recepcionista comunicar o paciente
- [ ] Ao cancelar, sistema pergunta se deseja reagendar (integração com Feature 009)
- [ ] Cadeira e horário liberados ficam disponíveis para novos agendamentos
- [ ] Se o agendamento tinha materiais reservados (Feature 005) e ainda não confirmados/baixados (Feature 016), o cancelamento estorna a reserva automaticamente
- [ ] Se o agendamento já teve baixa de material confirmada ou registro no odontograma (Feature 011), o cancelamento NÃO reverte esses registros automaticamente — apenas sinaliza a inconsistência para revisão manual
- [ ] Não existe prazo mínimo de antecedência para cancelar
- [ ] Cancelamento fica visível no Histórico de Consultas do paciente (Feature 010)
- [ ] Cancelamentos recorrentes do mesmo paciente NÃO geram alerta automático

---

## Cenários

### Cenário 1: Cancelar com motivo
```
Dado um agendamento futuro confirmado
Quando um usuário cancela informando o motivo "Paciente remarcou por conflito de horário"
Então o sistema muda o status do agendamento para "cancelado"
E registra o motivo
E dispara notificação interna para a Recepcionista comunicar o paciente
```

### Cenário 2: Tentar cancelar sem motivo
```
Dado um agendamento futuro confirmado
Quando um usuário tenta cancelar sem informar motivo
Então o sistema bloqueia a ação e exige o preenchimento do motivo
```

### Cenário 3: Cancelamento libera a cadeira e horário
```
Dado um agendamento cancelado às "2026-10-15 14:00" na "Cadeira 1"
Quando outro usuário tenta agendar nesse mesmo horário e cadeira
Então o sistema permite normalmente, pois o horário foi liberado
```

### Cenário 4: Pergunta de reagendamento após cancelamento
```
Dado um agendamento sendo cancelado
Quando o cancelamento é confirmado
Então o sistema pergunta "Deseja reagendar? Sim/Não" (Feature 009, Cenário 1)
```

### Cenário 5: Cancelamento estorna material reservado (ainda não confirmado)
```
Dado um agendamento com 2 unidades de "Resina Composta" reservadas (Feature 005) e ainda não confirmadas
Quando o agendamento é cancelado
Então o sistema estorna as 2 unidades, tornando-as disponíveis novamente no estoque (Feature 016)
```

### Cenário 6: Cancelamento de agendamento já com baixa/registro confirmados
```
Dado um agendamento cujo procedimento já foi confirmado pelo Dentista, com baixa de estoque efetuada e registro no odontograma (Feature 011)
Quando um usuário tenta cancelar esse agendamento
Então o sistema alerta que existem registros clínicos/de estoque já confirmados vinculados a ele
E exige confirmação explícita adicional antes de efetivar o cancelamento
```

---

## Exemplos de Código

```typescript
interface CancelamentoAgendamento {
  agendamento_id: string;
  motivo: string;
  cancelado_por: string; // usuario_id
  cancelado_em: string;
}

// Exemplo de uso esperado
await agendamentoService.cancelar({
  agendamento_id: 'agendamento-001',
  motivo: 'Paciente remarcou por conflito de horário',
  cancelado_por: 'usuario-003'
});
```

---

## Dependências

- Feature 006 (Criar Agendamento) — só existe cancelamento de algo já agendado
- Feature 005 (Criar Procedimento) e Feature 016 (Controle de Estoque) — estorno de reserva de material
- Feature 011 (Odontograma) — verificação de registro já confirmado antes de cancelar
- Feature 017 (Notificações Internas) — dispara aviso para a Recepcionista

---

## Regras de Negócio

- [stated] Todos os papéis podem cancelar
- [stated] Motivo do cancelamento é obrigatório
- [stated] Notificação interna é enviada à Recepcionista para comunicar o paciente
- [correção] Material reservado (não confirmado) é estornado automaticamente ao cancelar
- [correção] Material já baixado ou procedimento já registrado no odontograma NÃO é revertido automaticamente — o cancelamento exige confirmação extra do usuário, deixando a reversão desses registros como ação manual/explícita
- [correção] Não existe prazo mínimo de antecedência para cancelar
- [correção] Cancelamento fica visível no Histórico de Consultas do paciente (Feature 010)
- [correção] Cancelamentos recorrentes do mesmo paciente NÃO geram alerta automático

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Quando há registro clínico já confirmado, existe uma ação formal de "reverter procedimento" no odontograma/estoque, ou a reversão é sempre manual/administrativa?
