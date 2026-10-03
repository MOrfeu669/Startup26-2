# Feature 003: Cadastro de Dentistas

**Status:** 🟡 Em Definição
**Fase:** MVP
**Complexidade:** 🟢 Baixa
**Dependências:** Feature 001 (Autenticação & Roles), Feature 002 (Criar/Configurar Clínica)

---

## Contexto

A clínica tem número ilimitado de dentistas. O Admin precisa cadastrar cada dentista para que ele possa: fazer login (papel `dentista`, definido na Feature 001), aparecer disponível para agendamento (Feature 006) e ter sua própria agenda/notificações (Feature 007, 018).

Este cadastro é o registro do **profissional** em si — dados de quem ele é — diferente do login/senha (que já é tratado na Feature 001).

---

## Requisitos

- [ ] Admin cadastra dentista vinculado à clínica
- [ ] Cadastro cria automaticamente o usuário com papel `dentista` (integração com Feature 001)
- [ ] Cadastro captura: nome, CRO, telefone, CPF
- [ ] Cadastro pode registrar especialidade(s) do dentista de forma informativa (não restringe quais procedimentos podem ser agendados para ele — ver Feature 005)
- [ ] Número de dentistas cadastrados não tem limite
- [ ] Dentista cadastrado e ativo fica disponível para ser selecionado em qualquer agendamento (Feature 006)
- [ ] Dentista segue o horário geral da clínica (Feature 002), podendo marcar exceções como bloqueios de agenda (Feature 006)
- [ ] Admin pode remover um dentista; agendamentos futuros já marcados com ele passam a exibir aviso de alerta (mesmo comportamento da cadeira desativada, Feature 002) e ele deixa de aceitar novos agendamentos
- [ ] Admin pode editar dados do dentista já cadastrado, incluindo especialidades

---

## Cenários

### Cenário 1: Cadastrar novo dentista
```
Dado um Admin autenticado na clínica
Quando ele cadastra um dentista informando nome, CRO, telefone e CPF
Então o sistema cria o registro do dentista vinculado à clínica
E cria um usuário com papel "dentista" para ele poder fazer login
```

### Cenário 2: Dentista cadastrado aparece na agenda
```
Dado um dentista recém-cadastrado
Quando qualquer usuário (Admin/Dentista/Recepcionista) cria um agendamento
Então esse dentista aparece na lista de dentistas disponíveis para seleção
```

### Cenário 3: Cadastro sem limite de dentistas
```
Dado uma clínica com 15 dentistas já cadastrados
Quando o Admin cadastra o 16º dentista
Então o sistema aceita normalmente, sem restrição de quantidade
```

### Cenário 4: Editar dados de um dentista
```
Dado um dentista já cadastrado
Quando o Admin atualiza seu telefone de contato
Então o sistema salva a alteração mantendo o histórico de agendamentos vinculados a ele
```

### Cenário 5: Cadastrar dentista com especialidade (informativa)
```
Dado um Admin cadastrando um novo dentista
Quando ele informa a especialidade "Endodontia"
Então o sistema salva essa especialidade vinculada ao dentista, de forma apenas informativa
E esse dentista continua disponível para qualquer procedimento no agendamento (Feature 006), sem restrição por especialidade
```

### Cenário 6: Admin remove um dentista com agendamentos futuros
```
Dado um dentista com agendamentos futuros com status "agendado"
Quando o Admin remove o cadastro desse dentista
Então os agendamentos futuros vinculados a ele passam a exibir aviso de alerta
E aparecem destacados na Agenda (Feature 007), assim como ocorre com cadeira desativada (Feature 002)
E o dentista deixa de aceitar novos agendamentos (Feature 006)
```
> No MVP, testa-se a marcação de alerta e o bloqueio de novos agendamentos; o destaque visual na Agenda (Feature 007, V1) fica como `it.todo`.

---

## Exemplos de Código

```typescript
interface Dentista {
  id: string;
  usuario_id: string; // vínculo com Usuario (Feature 001)
  clinica_id: string;
  nome: string;
  cro: string;
  telefone: string;
  cpf: string;
  especialidades?: string[]; // informativo — não restringe agendamento (Feature 005/006)
  ativo: boolean; // false após remoção; agendamentos futuros ficam com alerta
}

// Exemplo de uso esperado
const dentista = await dentistaService.cadastrar({
  clinica_id: 'clinica-001',
  nome: 'Dra. Ana Souza',
  cro: 'CRO-RS 12345',
  telefone: '(54) 99999-0000',
  cpf: '000.000.000-00',
  email_login: 'dra.ana@clinica.com',
  especialidades: ['endodontia']
});
```

---

## Dependências

- Feature 001 (Autenticação & Roles) — cadastro de dentista gera um usuário com papel `dentista`
- Feature 002 (Criar/Configurar Clínica) — dentista é vinculado a uma clínica já existente

---

## Regras de Negócio

- [stated] Número ilimitado de dentistas por clínica
- [stated] Dentista pode utilizar qualquer cadeira disponível (não fica vinculado a uma cadeira fixa — ver Feature 002)
- [correção] Campos cadastrais: nome, CRO, telefone, CPF
- [correção] Especialidade é informativa e NÃO restringe quais procedimentos podem ser agendados para o dentista
- [correção] Dentista segue o horário geral da clínica; exceções são tratadas como bloqueios de agenda (Feature 006)
- [correção] Admin pode remover um dentista; agendamentos futuros vinculados a ele passam a exibir alerta (não são cancelados)
- [stated] Dentista inativo (removido) bloqueia novos agendamentos com ele (validação aplicada na Feature 006; emergência retroativa ignora)

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Dentista tem foto de perfil?

---

## Notas

Este cadastro é o registro do profissional; o acesso ao sistema (login) é resolvido pela Feature 001. Fornece a lista de dentistas usada pela Feature 006 (Criar Agendamento) e pela Feature 007 (Visualizar Agenda).

**Histórico:** 2026-10-02 — aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: INC-01, ESC-03, ESC-04, ESC-05, REF-01, REF-03).
