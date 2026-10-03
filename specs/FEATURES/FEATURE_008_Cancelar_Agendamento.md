# Feature 008: Cancelar Agendamento

**Status:** 🟡 Em Definição
**Fase:** V1
**Complexidade:** 🟡 Média
**Dependências:** Feature 006, Feature 009, Feature 011, Feature 018

---

## Contexto

Consultas marcadas podem precisar ser canceladas por qualquer um dos três papéis. É obrigatório registrar o motivo, e a recepcionista precisa ser avisada internamente para comunicar o paciente (já que o paciente não tem acesso direto ao sistema — confirmado na Feature 001/004).

---

## Requisitos

- [ ] Admin, Dentista e Recepcionista podem cancelar um agendamento
- [ ] Só é possível cancelar um agendamento **antes** de `concluido` (status `agendado`, `em_espera` ou `iniciado`)
- [ ] Cancelamento exige motivo escrito
- [ ] Ao cancelar, sistema dispara notificação interna para a Recepcionista comunicar o paciente (Feature 018)
- [ ] Ao cancelar, sistema pergunta se deseja reagendar (integração com Feature 009)
- [ ] Cadeira e horário liberados ficam disponíveis para novos agendamentos
- [ ] Cancelamento não altera o estoque: não há reserva de material, e a baixa só ocorre na conclusão (Feature 010/017), que nunca aconteceu em um agendamento cancelável
- [ ] Se o agendamento já tem registro `confirmado` no odontograma (Feature 011), o sistema alerta e exige confirmação explícita adicional; com a confirmação, o sistema marca automaticamente esses registros como `revertido`
- [ ] Não existe prazo mínimo de antecedência para cancelar
- [ ] Cancelamento fica visível no Histórico de Consultas do paciente (Feature 010)
- [ ] Cancelamentos recorrentes do mesmo paciente NÃO geram alerta automático

---

## Cenários

### Cenário 1: Cancelar com motivo
```
Dado um agendamento futuro com status "agendado"
Quando um usuário cancela informando o motivo "Paciente remarcou por conflito de horário"
Então o sistema muda o status do agendamento para "cancelado"
E registra o motivo
E dispara notificação interna para a Recepcionista comunicar o paciente
```

### Cenário 2: Tentar cancelar sem motivo
```
Dado um agendamento futuro com status "agendado"
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

### Cenário 5: Não é possível cancelar agendamento concluído
```
Dado um agendamento com status "concluido"
Quando um usuário tenta cancelá-lo
Então o sistema bloqueia a ação e retorna erro "Agendamento já concluído não pode ser cancelado"
```

### Cenário 6: Cancelamento de agendamento com registro confirmado no odontograma
```
Dado um agendamento com status "iniciado" que já tem um registro "confirmado" no odontograma (Feature 011)
Quando um usuário tenta cancelar esse agendamento
Então o sistema alerta que existem registros clínicos confirmados vinculados a ele
E exige confirmação explícita adicional antes de efetivar o cancelamento
E, com a confirmação, marca esses registros do odontograma como "revertido" (Feature 011, Cenário 5)
```

---

## Exemplos de Código

```typescript
interface CancelamentoAgendamento {
  agendamento_id: string;
  motivo: string;
  cancelado_por: string; // usuario_id
  cancelado_em: string;
  confirmou_reversao_odontograma?: boolean; // exigido quando há registro confirmado (Cenário 6)
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
- Feature 009 (Reagendamento Automático) — pergunta de reagendamento
- Feature 011 (Odontograma) — verificação e reversão de registro confirmado. Integração bidirecional: pela ordem do roadmap, esta feature é implementada antes da 011, e a reversão entra quando a 011 existir
- Feature 018 (Notificações Internas) — dispara aviso para a Recepcionista; no V1 usa uma interface temporária, substituída pela implementação real no V1.5

---

## Regras de Negócio

- [stated] Todos os papéis podem cancelar
- [stated] Motivo do cancelamento é obrigatório
- [stated] Notificação interna é enviada à Recepcionista para comunicar o paciente
- [stated] Só é possível cancelar antes de `concluido`
- [stated] Com a confirmação extra, o cancelamento reverte automaticamente os registros confirmados do odontograma (marcados como `revertido`, nunca apagados)
- [stated] Cancelamento não afeta o estoque (não existe reserva; a baixa só ocorre na conclusão)
- [correção] Não existe prazo mínimo de antecedência para cancelar
- [correção] Cancelamento fica visível no Histórico de Consultas do paciente (Feature 010)
- [correção] Cancelamentos recorrentes do mesmo paciente NÃO geram alerta automático

---

## Notas

**Histórico:** 2026-10-02 — aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: PEN-02, INC-01, INC-05, INC-09, ESC-06, ESC-07, ESC-08). O antigo Cenário 5 (estorno de reserva) foi substituído por "Não é possível cancelar agendamento concluído". A pendência sobre "ação formal de reverter" foi resolvida.
