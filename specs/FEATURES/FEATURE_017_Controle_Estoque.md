# Feature 017: Controle de Estoque

**Status:** 🟡 Em Definição
**Fase:** V1.5
**Complexidade:** 🟡 Média
**Dependências:** Feature 001, Feature 005, Feature 010, Feature 012, Feature 018, Feature 019

---

## Contexto

A clínica precisa controlar materiais/insumos usados nos procedimentos (Feature 005), com alerta de quantidade mínima e remoção automática de itens vencidos. Diferente da baixa por validade, a baixa por uso em procedimento depende de uma ação do Dentista: ela acontece quando ele conclui o atendimento (salva a Evolução, Feature 010).

---

## Requisitos

- [ ] Todos os papéis (Admin, Dentista, Recepcionista) podem gerenciar o estoque
- [ ] Cadastro de material: nome, quantidade, quantidade mínima, validade
- [ ] Material já existente pode receber reabastecimento (entrada de mais quantidade)
- [ ] Cada entrada de reabastecimento de um material existente é registrada como um lote próprio (com sua validade), agrupado internamente sob o mesmo nome de material
- [ ] Toda movimentação de estoque (entrada, baixa, remoção por vencimento) é registrada em um histórico de logs
- [ ] **Não existe reserva de material**: a quantidade do material é a soma dos lotes válidos
- [ ] Baixa automática por vencimento: lote removido automaticamente ao passar da validade
- [ ] Baixa por uso: ocorre na **conclusão do atendimento** (Dentista ou Admin salva a Evolução, Feature 010), para os materiais dos procedimentos executados — procedimento avulso ou itens do Plano de Tratamento (Feature 012)
- [ ] A baixa por uso consome primeiro o lote válido que **vence antes** (FEFO)
- [ ] Alerta de estoque abaixo do mínimo: exibido em vermelho no Dashboard (Feature 019), mostrando quantidade e nome do material, e como notificação crítica no sino (Feature 018)

---

## Cenários

### Cenário 1: Criar material
```
Dado um usuário autenticado
Quando ele cadastra o material "Resina Composta" com quantidade 50, quantidade mínima 10 e validade "2027-01-01"
Então o sistema salva o material vinculado à clínica
```

### Cenário 2: Baixa na conclusão do atendimento
```
Dado o material "Resina Composta" com 50 unidades em estoque
E um agendamento "iniciado" com o procedimento "Restauração", vinculado a 2 unidades desse material (Feature 005)
Quando o Dentista conclui o atendimento salvando a Evolução (Feature 010)
Então o sistema reduz o estoque para 48 unidades
E registra a movimentação "baixa" vinculada ao agendamento
```

### Cenário 3: Remoção automática de material vencido
```
Dado o material "Anestésico X" com um lote de validade "2026-09-01"
Quando a data do sistema ultrapassa "2026-09-01"
Então o sistema remove automaticamente esse lote do estoque
E registra a movimentação "vencimento"
```

### Cenário 4: Alerta de estoque mínimo
```
Dado o material "Luvas Descartáveis" com quantidade mínima 20
Quando o estoque atual cai para 15 unidades
Então o Dashboard (Feature 019) exibe um alerta vermelho com o nome do material e a quantidade atual
```

### Cenário 5: Baixa consome primeiro o lote que vence antes (FEFO)
```
Dado o material "Resina Composta" com um lote de 10 unidades (validade "2026-12-01") e outro de 40 unidades (validade "2027-06-01")
Quando um atendimento concluído dá baixa de 2 unidades
Então o sistema consome as 2 unidades do lote com validade "2026-12-01"
```

### Cenário 6: Reabastecer material existente cria novo lote
```
Dado o material "Resina Composta" já cadastrado com 10 unidades restantes (lote com validade "2026-12-01")
Quando um usuário reabastece com mais 40 unidades (validade "2027-06-01")
Então o sistema registra um novo lote de 40 unidades
E a quantidade total do material passa a ser 50, distribuída entre os dois lotes
```

### Cenário 7: Consultar histórico de movimentações
```
Dado um material com entradas, baixas e vencimentos ao longo do tempo
Quando um usuário consulta o histórico de logs desse material
Então vê cada movimentação registrada: tipo (entrada/baixa/vencimento), quantidade, usuário responsável e data/hora
```

### Cenário 8: Alerta de estoque mínimo visível para todos os papéis
```
Dado o material "Luvas Descartáveis" abaixo da quantidade mínima
Quando qualquer usuário (Admin, Dentista ou Recepcionista) abre o sino de notificações (Feature 018)
Então todos veem o mesmo alerta crítico, sem distinção de papel, mesmo que o widget esteja oculto no seu Dashboard
```

---

## Exemplos de Código

```typescript
interface Material {
  id: string;
  clinica_id: string;
  nome: string;
  quantidade_minima: number;
  lotes: LoteMaterial[];
}

interface LoteMaterial {
  id: string;
  material_id: string;
  quantidade: number; // saldo atual do lote
  validade?: string;
  criado_em: string;
}

// quantidade do material = soma de quantidade de todos os lotes não vencidos

interface MovimentacaoEstoque {
  id: string;
  material_id: string;
  lote_id: string;
  tipo: 'entrada' | 'baixa' | 'vencimento';
  quantidade: number;
  usuario_id?: string; // ausente em movimentações automáticas (ex: vencimento)
  agendamento_id?: string; // presente nas baixas por conclusão de atendimento
  registrado_em: string;
}

// Exemplo de uso esperado
const material = await estoqueService.criarMaterial({
  clinica_id: 'clinica-001',
  nome: 'Resina Composta',
  quantidade_minima: 10,
  lote_inicial: { quantidade: 50, validade: '2027-01-01' }
});

// Reabastecer material existente (novo lote)
await estoqueService.reabastecer({
  material_id: material.id,
  quantidade: 40,
  validade: '2027-06-01'
});

// Chamado pela conclusão do atendimento (Feature 010) — baixa FEFO dos materiais executados
await estoqueService.baixarPorAtendimentoConcluido({
  agendamento_id: 'agendamento-020'
});
```

---

## Dependências

- Feature 001 (Autenticação & Roles)
- Feature 005 (Criar Procedimento) — materiais vinculados a procedimentos
- Feature 010 (Prontuário Básico) — a conclusão do atendimento (salvar Evolução) dispara a baixa
- Feature 012 (Plano de Tratamento) — itens do plano executados no atendimento
- Feature 018 (Notificações Internas) — alerta crítico de estoque abaixo do mínimo
- Feature 019 (Dashboard & Alertas) — exibição do alerta

---

## Regras de Negócio

- [stated] Todos gerenciam o estoque
- [stated] Material: nome, quantidade, quantidade mínima, validade
- [stated] Baixa por uso em procedimento é CONFIRMADA pelo Dentista (não é automática) — a confirmação é a conclusão do atendimento (salvar a Evolução)
- [stated] Produtos vencidos são removidos AUTOMATICAMENTE
- [stated] Alerta de estoque mínimo aparece em vermelho no Dashboard, com quantidade e nome do material
- [stated] Não existe reserva de material; a baixa ocorre na conclusão do atendimento, para procedimento avulso e itens do plano
- [stated] A baixa consome primeiro o lote válido que vence antes (FEFO)
- [stated] O alerta pode ser ocultado no Dashboard (Feature 019), mas sempre aparece no sino (Feature 018)
- [correção] Material existente pode ser reabastecido; cada reabastecimento cria um novo lote (com sua própria validade), agrupado sob o mesmo material
- [correção] Toda movimentação de estoque é registrada em um histórico de logs (entrada, baixa, vencimento)
- [correção] Alerta de estoque abaixo do mínimo é visível a todos os papéis, sem distinção

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Se, na conclusão do atendimento, o estoque válido for menor que a quantidade a baixar: bloqueia a conclusão, permite saldo negativo, ou conclui e gera alerta?
- ⚠️ O Dentista pode ajustar a quantidade efetivamente usada no momento da conclusão (ex: usou 3 em vez de 2)?

---

## Notas

**Histórico:** 2026-10-02 — renumerada de 016 para 017; aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: INC-05, INC-11, INC-15, ESC-13, PEN-04). O conceito de reserva (total/reservado/disponível) foi removido. Os antigos Cenários 5 ("reserva reduz disponível") e 6 ("vencido com reserva futura") foram substituídos pelo Cenário 5 (FEFO), e os demais foram renumerados. A pendência "quem age no alerta de vencido com reserva" ficou obsoleta.
