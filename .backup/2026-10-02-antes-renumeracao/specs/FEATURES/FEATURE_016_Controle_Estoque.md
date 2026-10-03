# Feature 016: Controle de Estoque

**Status:** 🟡 Em Definição
**Fase:** V1.5
**Complexidade:** 🟡 Média
**Dependências:** Feature 001 — complementar à Feature 005

---

## Contexto

A clínica precisa controlar materiais/insumos usados nos procedimentos (Feature 005), com alerta de quantidade mínima e remoção automática de itens vencidos. Diferente da baixa por validade, a baixa por uso em procedimento precisa de confirmação do Dentista.

---

## Requisitos

- [ ] Todos os papéis (Admin, Dentista, Recepcionista) podem gerenciar o estoque
- [ ] Cadastro de material: nome, quantidade, quantidade mínima, validade
- [ ] Material já existente pode receber reabastecimento (entrada de mais quantidade)
- [ ] Cada entrada de reabastecimento de um material existente é registrada como um lote próprio (com sua validade), agrupado internamente sob o mesmo nome de material
- [ ] Toda movimentação de estoque (entrada, reserva, baixa, remoção por vencimento) é registrada em um histórico de logs
- [ ] Estoque distingue quantidade "total", "reservada" (Feature 005) e "disponível" (total - reservada)
- [ ] Baixa automática por vencimento: material removido automaticamente ao passar da validade, por lote, EXCETO a quantidade já reservada para agendamentos futuros confirmados
- [ ] Material vencido com reserva vinculada a agendamento futuro gera alerta em vez de remoção silenciosa dessa quantidade reservada; o agendamento NÃO é cancelado automaticamente, pois pode haver outros lotes ainda válidos
- [ ] Baixa por uso: reduzida da quantidade "reservada"/total somente após o Dentista confirmar a realização do procedimento
- [ ] Cancelamento de agendamento (Feature 008) estorna a reserva, devolvendo a quantidade para "disponível"
- [ ] Alerta de estoque mínimo: exibido em vermelho no Dashboard (Feature 018), visível para todos os papéis, mostrando quantidade e nome do material

---

## Cenários

### Cenário 1: Criar material
```
Dado um usuário autenticado
Quando ele cadastra o material "Resina Composta" com quantidade 50, quantidade mínima 10 e validade "2027-01-01"
Então o sistema salva o material vinculado à clínica
```

### Cenário 2: Confirmar baixa após procedimento
```
Dado o material "Resina Composta" com 50 unidades em estoque
E um procedimento "Restauração" vinculado a 2 unidades desse material (Feature 005)
Quando o Dentista confirma a realização do procedimento
Então o sistema reduz o estoque para 48 unidades
```

### Cenário 3: Remoção automática de material vencido
```
Dado o material "Anestésico X" com validade "2026-09-01"
Quando a data do sistema ultrapassa "2026-09-01"
Então o sistema remove automaticamente esse material do estoque
```

### Cenário 4: Alerta de estoque mínimo
```
Dado o material "Luvas Descartáveis" com quantidade mínima 20
Quando o estoque atual cai para 15 unidades
Então o Dashboard (Feature 018) exibe um alerta vermelho com o nome do material e a quantidade atual
```

### Cenário 5: Reserva reduz a quantidade disponível
```
Dado o material "Resina Composta" com 50 unidades totais, nenhuma reservada
Quando um agendamento reserva 2 unidades (Feature 005)
Então a quantidade "disponível" passa a ser 48, mesmo que o "total" continue 50
```

### Cenário 6: Material vencido com reserva futura não é removido silenciosamente
```
Dado o material "Anestésico X" com validade "2026-09-01" e 2 unidades reservadas para um agendamento em "2026-09-05"
Quando a data do sistema ultrapassa "2026-09-01"
Então o sistema remove apenas a quantidade NÃO reservada
E gera um alerta indicando que o agendamento em "2026-09-05" depende de material vencido
E o agendamento NÃO é cancelado automaticamente, pois pode haver outros lotes ainda válidos
```

### Cenário 7: Reabastecer material existente cria novo lote
```
Dado o material "Resina Composta" já cadastrado com 10 unidades restantes (lote com validade "2026-12-01")
Quando um usuário reabastece com mais 40 unidades (validade "2027-06-01")
Então o sistema registra um novo lote de 40 unidades
E a quantidade total do material passa a ser 50, distribuída entre os dois lotes
```

### Cenário 8: Consultar histórico de movimentações
```
Dado um material com entradas, reservas e baixas ao longo do tempo
Quando um usuário consulta o histórico de logs desse material
Então vê cada movimentação registrada: tipo (entrada/reserva/baixa/vencimento), quantidade, usuário responsável e data/hora
```

### Cenário 9: Alerta de estoque mínimo visível para todos os papéis
```
Dado o material "Luvas Descartáveis" abaixo da quantidade mínima
Quando qualquer usuário (Admin, Dentista ou Recepcionista) abre o Dashboard
Então todos veem o mesmo alerta vermelho, sem distinção de papel
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
  quantidade_total: number;
  quantidade_reservada: number;
  validade?: string;
  criado_em: string;
}

// quantidade_disponivel (por material) = soma de (quantidade_total - quantidade_reservada) de todos os lotes não vencidos

interface MovimentacaoEstoque {
  id: string;
  material_id: string;
  lote_id: string;
  tipo: 'entrada' | 'reserva' | 'baixa' | 'estorno' | 'vencimento';
  quantidade: number;
  usuario_id?: string; // ausente em movimentações automáticas (ex: vencimento)
  agendamento_id?: string;
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

await estoqueService.confirmarBaixaPorProcedimento({
  material_id: material.id,
  agendamento_id: 'agendamento-020',
  quantidade_utilizada: 2
});
```

---

## Dependências

- Feature 001 (Autenticação & Roles)
- Feature 005 (Criar Procedimento) — reserva/baixa vinculada a procedimentos

---

## Regras de Negócio

- [stated] Todos gerenciam o estoque
- [stated] Material: nome, quantidade, quantidade mínima, validade
- [stated] Baixa por uso em procedimento é CONFIRMADA pelo Dentista (não é automática)
- [stated] Produtos vencidos são removidos AUTOMATICAMENTE
- [stated] Alerta de estoque mínimo aparece em vermelho no Dashboard, com quantidade e nome do material
- [correção] Estoque distingue "total", "reservado" e "disponível"; a reserva feita no agendamento (Feature 005) bloqueia a quantidade correspondente do "disponível"
- [correção] Remoção automática por vencimento não afeta quantidade já reservada para agendamento futuro confirmado — nesse caso, gera alerta em vez de remover silenciosamente, e o agendamento não é cancelado automaticamente
- [correção] Cancelamento de agendamento (Feature 008) estorna a reserva, devolvendo a quantidade ao "disponível"
- [correção] Material existente pode ser reabastecido; cada reabastecimento cria um novo lote (com sua própria validade), agrupado sob o mesmo material
- [correção] Toda movimentação de estoque é registrada em um histórico de logs (entrada, reserva, baixa, estorno, vencimento)
- [correção] Alerta de estoque crítico é visível a todos os papéis no Dashboard, sem distinção

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Quando o alerta de "material vencido com reserva futura" é gerado, quem deve agir sobre ele — existe um responsável designado, ou fica genericamente visível a todos até ser resolvido?
