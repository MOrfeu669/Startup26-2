# Feature 005: Criar Procedimento

**Status:** 🟡 Em Definição
**Fase:** MVP
**Complexidade:** 🟡 Média
**Dependências:** Feature 001 — Feature 016 é complementar (materiais podem ser vinculados depois)

---

## Contexto

Procedimentos são os "tipos de serviço" que a clínica oferece (ex: Limpeza, Restauração, Extração). Cada procedimento tem um tempo médio de execução e uma lista de materiais que serão consumidos do estoque quando ele for realizado. É a peça que conecta o Agendamento (Feature 006), o Estoque (Feature 016) e o Odontograma (Feature 011).

---

## Requisitos

- [ ] Admin e Dentista podem criar procedimento
- [ ] Procedimento tem nome (nomeado conforme sua função/finalidade), tempo médio de execução e valor médio — ambos são estimativas, não valores fixos
- [ ] Procedimento pode ser criado sem materiais vinculados; materiais podem ser incluídos posteriormente, inclusive antes de o módulo de Estoque (Feature 016) existir de fato
- [ ] Materiais vinculados (quando existentes) habilitam a baixa automática/reserva (Feature 016)
- [ ] Procedimento não exige nem valida especialidade do dentista — qualquer dentista pode ser agendado para qualquer procedimento
- [ ] Procedimento pode ser editado a qualquer momento (incluindo alterar materiais e quantidades vinculados)
- [ ] Apenas o Admin (dono da clínica) pode excluir um procedimento
- [ ] Procedimento cadastrado fica disponível para seleção no Agendamento (Feature 006) e no Odontograma (Feature 011)

---

## Cenários

### Cenário 1: Criar procedimento com materiais vinculados
```
Dado um Dentista autenticado
Quando ele cria o procedimento "Restauração" com tempo médio de 40min e vincula 2 unidades do material "Resina Composta"
Então o sistema salva o procedimento com o material vinculado
```

### Cenário 2: Criar procedimento sem materiais
```
Dado um Admin autenticado
Quando ele cria o procedimento "Avaliação/Consulta" sem vincular nenhum material
Então o sistema salva o procedimento normalmente, sem consumo de estoque associado
```

### Cenário 3: Reutilizar procedimento em agendamento
```
Dado o procedimento "Limpeza" já cadastrado
Quando um usuário cria um agendamento selecionando esse procedimento
Então o sistema pré-preenche a duração com o tempo médio, permitindo ajuste manual (Feature 006)
```

### Cenário 4: Materiais reservados ao agendar
```
Dado o procedimento "Restauração" vinculado a 2 unidades de "Resina Composta"
Quando um agendamento é criado com esse procedimento
Então o sistema reserva automaticamente 2 unidades de "Resina Composta"
E essas 2 unidades deixam de contar como "disponível" para novas reservas (Feature 016)
```

### Cenário 5: Estoque insuficiente para reservar
```
Dado o material "Resina Composta" com apenas 1 unidade disponível (não reservada)
Quando um usuário tenta agendar o procedimento "Restauração" (que exige 2 unidades)
Então o sistema bloqueia a criação do agendamento e retorna erro "Estoque insuficiente para reservar material"
```

### Cenário 6: Adicionar materiais a um procedimento já existente
```
Dado o procedimento "Restauração" criado sem materiais vinculados (Feature 016 ainda não existia)
Quando o Dentista edita o procedimento e vincula 2 unidades de "Resina Composta"
Então o sistema passa a reservar/dar baixa desse material nos próximos agendamentos desse procedimento
```

### Cenário 7: Apenas Admin pode excluir procedimento
```
Dado um Dentista autenticado
Quando ele tenta excluir um procedimento
Então o sistema bloqueia a ação, pois exclusão é exclusiva do Admin
```

---

## Exemplos de Código

```typescript
interface Procedimento {
  id: string;
  clinica_id: string;
  nome: string; // nomeado conforme sua função (ex: "Restauração", "Limpeza")
  tempo_medio_minutos: number; // estimativa, não fixo
  valor_medio: number; // estimativa, não fixo
  materiais: MaterialVinculado[]; // pode começar vazio, editado depois
}

interface MaterialVinculado {
  material_id: string; // referência à Feature 016
  quantidade_utilizada: number;
}

// Exemplo de uso esperado
const procedimento = await procedimentoService.criar({
  clinica_id: 'clinica-001',
  nome: 'Restauração',
  tempo_medio_minutos: 40,
  valor_medio: 150.00,
  materiais: [] // pode ser vinculado depois
});
```

---

## Dependências

- Feature 001 (Autenticação & Roles) — determina quem pode criar (Admin/Dentista)
- Feature 016 (Controle de Estoque) — complementar; materiais podem ser vinculados após a criação do procedimento

---

## Regras de Negócio

- [stated] Quem cria: Admin e Dentista
- [stated] Materiais são vinculados no momento da criação do procedimento
- [stated] Tempo médio pode ser alterado no momento do agendamento (não altera o padrão do procedimento)
- [stated] Ao agendar com procedimento, materiais são reservados automaticamente no estoque
- [correção] A reserva de material BLOQUEIA a quantidade correspondente do "disponível" em estoque (Feature 016) — não é apenas informativa. Se não houver quantidade disponível suficiente, o agendamento não pode ser criado
- [correção] A reserva é reconciliada com a baixa confirmada pelo Dentista (Feature 016): ao confirmar o procedimento, a reserva vira baixa efetiva; se o agendamento for cancelado antes da confirmação, a reserva é estornada (Feature 008)
- [correção] Procedimento pode ser criado sem materiais vinculados; materiais podem ser adicionados posteriormente
- [correção] Procedimento é nomeado conforme sua função; não possui campo de categoria separado
- [correção] Tempo e valor do procedimento são médias/estimativas, nunca fixos
- [correção] Procedimento pode ser editado a qualquer momento; apenas o Admin pode excluí-lo
- [correção] Procedimento NÃO se associa à especialidade do dentista — qualquer dentista pode ser agendado para qualquer procedimento

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Excluir um procedimento já usado em agendamentos anteriores afeta o histórico desses agendamentos, ou o procedimento fica "arquivado" e ainda referenciável no histórico?
