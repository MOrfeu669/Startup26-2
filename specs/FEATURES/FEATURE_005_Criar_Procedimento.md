# Feature 005: Criar Procedimento

**Status:** 🟡 Em Definição
**Fase:** MVP
**Complexidade:** 🟡 Média
**Dependências:** Feature 001 — Feature 017 é complementar (materiais podem ser vinculados depois)

---

## Contexto

Procedimentos são os "tipos de serviço" que a clínica oferece (ex: Limpeza, Restauração, Extração). Cada procedimento tem um tempo médio de execução e uma lista de materiais que serão consumidos do estoque quando ele for realizado. É a peça que conecta o Agendamento (Feature 006), o Plano de Tratamento (Feature 012), o Estoque (Feature 017) e o Odontograma (Feature 011).

---

## Requisitos

- [ ] Admin e Dentista podem criar procedimento
- [ ] Procedimento tem nome (nomeado conforme sua função/finalidade), tempo médio de execução e valor médio — ambos são estimativas, não valores fixos
- [ ] Procedimento pode ser criado sem materiais vinculados; materiais podem ser incluídos posteriormente, quando o módulo de Estoque (Feature 017) existir
- [ ] Materiais vinculados (quando existentes) são **baixados do estoque na conclusão do atendimento** (Feature 010/017) — não há reserva de material ao agendar
- [ ] Procedimento não exige nem valida especialidade do dentista — qualquer dentista pode ser agendado para qualquer procedimento
- [ ] Procedimento pode ser editado a qualquer momento (incluindo alterar materiais e quantidades vinculados)
- [ ] Procedimento **não é excluído após uso**: permanece no catálogo e pode ser usado em novos agendamentos
- [ ] Apenas o Admin (dono da clínica) pode excluir um procedimento ja criado
- [ ] Procedimento cadastrado fica disponível para seleção no Agendamento (Feature 006, como procedimento avulso), no Plano de Tratamento (Feature 012) e no Odontograma (Feature 011)

---

## Cenários

### Cenário 1: Criar procedimento com materiais vinculados
```
Dado um Dentista autenticado
Quando ele cria o procedimento "Restauração" com tempo médio de 40min e vincula 2 unidades do material "Resina Composta"
Então o sistema salva o procedimento com o material vinculado
```
> Depende da Feature 017 (materiais). No MVP vira `it.todo`.

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

### Cenário 4: Adicionar materiais a um procedimento já existente
```
Dado o procedimento "Restauração" criado sem materiais vinculados (Feature 017 ainda não existia)
Quando o Dentista edita o procedimento e vincula 2 unidades de "Resina Composta"
Então o sistema passa a dar baixa desse material na conclusão dos próximos atendimentos com esse procedimento
```
> Depende da Feature 017 (materiais). No MVP vira `it.todo`.

### Cenário 5: Apenas Admin pode excluir procedimento
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
  valor_medio: number; // estimativa, não fixo — usado no faturamento de procedimento avulso (Feature 019)
  materiais: MaterialVinculado[]; // pode começar vazio, editado depois
}

interface MaterialVinculado {
  material_id: string; // referência à Feature 017
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
- Feature 017 (Controle de Estoque) — complementar; materiais podem ser vinculados após a criação do procedimento

---

## Regras de Negócio

- [stated] Quem cria: Admin e Dentista
- [stated] Materiais são vinculados no momento da criação do procedimento
- [stated] Tempo médio pode ser alterado no momento do agendamento (não altera o padrão do procedimento)
- [stated] Não existe reserva de material: a baixa dos materiais vinculados acontece na conclusão do atendimento (salvar a Evolução, Feature 010), tanto para procedimento avulso quanto para itens do Plano de Tratamento (Feature 012)
- [stated] No MVP, os cenários que dependem de materiais (Feature 017) viram `it.todo`; o vínculo de materiais só passa a existir com a Feature 017
- [correção] Procedimento pode ser criado sem materiais vinculados; materiais podem ser adicionados posteriormente
- [correção] Procedimento é nomeado conforme sua função; não possui campo de categoria separado
- [correção] Tempo e valor do procedimento são médias/estimativas, nunca fixos
- [correção] Procedimento pode ser editado a qualquer momento; apenas o Admin pode excluí-lo
- [correção] Procedimento NÃO se associa à especialidade do dentista — qualquer dentista pode ser agendado para qualquer procedimento

---

## Notas

**Histórico:** 2026-10-02 — aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: INC-05, ESC-01). Removidos os cenários de reserva de material e de "Estoque insuficiente" (o conceito de reserva deixou de existir); os cenários foram renumerados (antigo Cenário 6 → 4; antigo 7 → 5).
