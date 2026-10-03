# Feature 009: Reagendamento Automático

**Status:** 🟡 Em Definição
**Fase:** V1
**Complexidade:** 🔴 Alta
**Dependências:** Feature 006, Feature 008, Feature 017

---

## Contexto

Existem dois cenários distintos de reagendamento no sistema:

1. **Reagendamento por cancelamento**: ao cancelar uma consulta, o sistema pergunta na hora se o usuário quer remarcar.
2. **Reagendamento por retorno programado**: o Admin ou Dentista marca que o paciente precisa retornar em uma data futura; dentro do prazo configurado pela clínica antes dessa data, a recepcionista é notificada para efetivamente marcar o novo horário.

---

## Requisitos

- [ ] Cenário 1: ao cancelar um agendamento, sistema pergunta "Deseja reagendar? Sim/Não"
- [ ] Cenário 1: se "Sim", abre o fluxo de novo agendamento (Feature 006) já vinculado ao mesmo paciente/dentista/procedimento
- [ ] Cenário 2: Admin ou Dentista podem marcar uma consulta como "retorno" com uma data futura definida
- [ ] Cenário 2: prazo de antecedência da notificação ("1 semana antes") é configurável pela clínica, não fixo
- [ ] A verificação identifica todo retorno dentro do prazo configurado que ainda não foi notificado — não depende de rodar exatamente no dia certo (mecanismo de recuperação/catch-up)
- [ ] Notificação de retorno permanece ativa/pendente até que a próxima consulta do paciente seja efetivamente marcada — não há novo lembrete/escalonamento separado, a notificação simplesmente continua visível
- [ ] Retorno programado não pode ser removido/cancelado depois de criado
- [ ] Notificação de retorno pede que a Recepcionista efetue o reagendamento (não é automático)
- [ ] Comunicação externa ao paciente (SMS/Email/WhatsApp) está fora do escopo desta feature — ver Notas

---

## Cenários

### Cenário 1: Reagendar imediatamente após cancelamento
```
Dado um agendamento sendo cancelado
Quando o sistema pergunta "Deseja reagendar?" e o usuário responde "Sim"
Então o sistema abre o fluxo de criação de novo agendamento (Feature 006)
E pré-preenche paciente e dentista do agendamento cancelado
```

### Cenário 2: Não reagendar após cancelamento
```
Dado um agendamento sendo cancelado
Quando o sistema pergunta "Deseja reagendar?" e o usuário responde "Não"
Então o cancelamento é finalizado sem nova consulta agendada
```

### Cenário 3: Marcar consulta como retorno
```
Dado uma consulta concluída
Quando o Dentista (ou o Admin) marca "retorno" com data prevista "2026-12-01"
Então o sistema registra a necessidade de retorno vinculada ao paciente e à data
```

### Cenário 3b: Tentativa de remover retorno já programado
```
Dado um retorno já registrado para um paciente
Quando um usuário tenta removê-lo ou cancelá-lo
Então o sistema não permite — o retorno programado é imutável após criado
```

### Cenário 4: Notificação automática dentro do prazo configurado
```
Dado um retorno registrado para "2026-12-01" e prazo configurado de 7 dias
Quando a data do sistema chega em "2026-11-24" (7 dias antes)
Então o sistema envia notificação interna para a Recepcionista: "Paciente [Nome] precisa ser reagendado"
```

### Cenário 5: Recuperação de notificação não disparada (catch-up)
```
Dado um retorno registrado para "2026-12-01"
E a rotina diária não rodou em "2026-11-24" (falha do sistema)
Quando a rotina roda novamente em "2026-11-26", ainda dentro do prazo e sem notificação enviada
Então o sistema identifica que esse retorno está dentro do prazo configurado e ainda não foi notificado
E envia a notificação para a Recepcionista normalmente
```

### Cenário 6: Notificação permanece ativa até o reagendamento efetivo
```
Dado uma notificação de retorno enviada à Recepcionista
Quando nenhum novo agendamento é criado para esse paciente nos dias seguintes
Então a notificação permanece visível como pendente (sem gerar um segundo lembrete separado)
E só deixa de aparecer como pendente quando a próxima consulta é efetivamente marcada
```

---

## Exemplos de Código

```typescript
interface RetornoProgramado {
  id: string;
  paciente_id: string;
  dentista_id: string;
  agendamento_origem_id: string;
  marcado_por: string; // usuario_id — Admin ou Dentista
  data_prevista: string;
  status: 'pendente' | 'notificado' | 'reagendado'; // imutável: não há status "cancelado"
}

interface ConfiguracaoNotificacaoRetorno {
  clinica_id: string;
  dias_antecedencia: number; // configurável pela clínica, padrão 7 dias
}

// Exemplo de uso esperado
const retorno = await retornoService.marcar({
  paciente_id: 'paciente-001',
  dentista_id: 'dentista-005',
  agendamento_origem_id: 'agendamento-020',
  marcado_por: 'dentista-005',
  data_prevista: '2026-12-01'
});

// Job/rotina que roda diariamente para verificar retornos a notificar.
// Busca todo retorno com status "pendente", dentro do prazo configurado,
// e ainda não notificado — não depende de rodar exatamente na data exata (catch-up).
await retornoService.verificarNotificacoesPendentes();
```

---

## Dependências

- Feature 006 (Criar Agendamento) — reagendar abre um novo fluxo de agendamento
- Feature 008 (Cancelar Agendamento) — Cenário 1 é disparado a partir do cancelamento
- Feature 017 (Notificações Internas) — entrega as notificações de ambos os cenários

---

## Regras de Negócio

- [stated] Cenário 1: Cancelar → perguntar "reagendar sim/não"
- [stated] Cenário 2: Marcar como retorno → escolher data → notificação para Recepcionista
- [correção] A verificação de retornos usa uma janela configurável ("X dias antes e ainda não notificado"), não um disparo pontual no dia exato — garante que uma falha de execução da rotina não impeça a notificação de ocorrer depois
- [correção] A notificação interna desta feature é para a Recepcionista agir (reagendar); o contato direto com o paciente sobre o retorno é responsabilidade da Feature 019 (Comunicação Externa), não desta spec
- [correção] Prazo de antecedência da notificação é configurável pela clínica (não fixo em 1 semana)
- [correção] Apenas Admin ou Dentista podem marcar um retorno
- [correção] Não há escalonamento/novo lembrete separado: a notificação de retorno permanece pendente até que a próxima consulta seja efetivamente marcada
- [correção] Retorno programado é imutável — não pode ser removido ou cancelado depois de criado

---

## Notas

Esta feature depende de um mecanismo de verificação por data (rotina/job diário) para o Cenário 2 — isso é um detalhe técnico de implementação a ser tratado na fase de código, mas o spec já deixa a regra de negócio clara, incluindo a tolerância a falhas de execução (catch-up).

**Escopo:** esta spec cobre apenas a notificação interna à equipe. O contato direto com o paciente (SMS/Email/WhatsApp) é responsabilidade da Feature 019 (Comunicação Externa ao Paciente).
