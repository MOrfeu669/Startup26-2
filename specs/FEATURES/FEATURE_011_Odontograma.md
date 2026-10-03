# Feature 011: Odontograma

**Status:** 🟡 Em Definição
**Fase:** V1
**Complexidade:** 🔴 Alta
**Dependências:** Feature 005, Feature 008, Feature 010, Feature 012 — integra com Feature 015 e Feature 016 (V1.5)

---

## Contexto

O Odontograma é um mapa bucal: uma representação visual da boca do paciente, dividida em quadrantes, onde é possível visualizar cada dente e as operações já realizadas nele. O Dentista altera o odontograma conforme realiza procedimentos. É uma feature separada, mas visualmente integrada ao prontuário do paciente. Também é onde próteses (Feature 016) aparecem vinculadas a dentes específicos.

---

## Requisitos

- [ ] Representação anatômica/geométrica da boca dividida em 4 quadrantes: superior direito, superior esquerdo, inferior esquerdo, inferior direito
- [ ] Visão invertida (espelhada), refletindo a perspectiva do dentista de frente para o paciente
- [ ] Numeração de dentes segue o padrão FDI
- [ ] Dentista (ou Admin, pela hierarquia da Feature 001) vincula procedimentos específicos a dentes (ex: Restauração, Endodontia, Extração, Implante, Coroa)
- [ ] Cada dente mantém histórico de operações realizadas nele, visualizável a qualquer momento
- [ ] Registrar um procedimento no dente **não altera o estoque**: a baixa de materiais acontece na conclusão do atendimento (Feature 010/017)
- [ ] Registros no odontograma podem ser editados diretamente pelo Dentista; **toda edição gera registro na trilha de auditoria** (Feature 010)
- [ ] Registro no odontograma possui status próprio (`confirmado` / `revertido`); quando um agendamento é cancelado com confirmação explícita (Feature 008), o sistema marca seus registros como `revertido` automaticamente
- [ ] Imagens (Feature 015) podem ser vinculadas a um dente específico, com descrição detalhada
- [ ] Próteses (Feature 016) aparecem no odontograma com suas informações

---

## Cenários

### Cenário 1: Marcar procedimento em um dente
```
Dado o odontograma de um paciente
Quando o Dentista seleciona o dente 26 (numeração FDI, quadrante superior esquerdo) e vincula o procedimento "Restauração"
Então o sistema registra a restauração naquele dente específico
```

### Cenário 2: Registrar procedimento no dente não altera o estoque
```
Dado o procedimento "Restauração" vinculado a 2 unidades de "Resina Composta" (Feature 005)
Quando o Dentista registra a realização desse procedimento no dente 26
Então o sistema salva o registro no odontograma com status "confirmado"
E o estoque de "Resina Composta" não é alterado (a baixa ocorre na conclusão do atendimento, Feature 010/017)
```

### Cenário 3: Visualização espelhada (perspectiva do dentista)
```
Dado o odontograma exibido em tela
Quando o Dentista visualiza o quadrante direito do paciente
Então o sistema exibe esse quadrante do lado esquerdo da tela (visão espelhada/invertida)
```

### Cenário 4: Prótese aparece no odontograma
```
Dado uma prótese registrada para o dente 16 (Feature 016)
Quando o Dentista abre o odontograma do paciente
Então vê a prótese indicada visualmente no dente 16, com suas informações
```
> Depende da Feature 016 (V1.5). No V1 vira `it.todo`.

### Cenário 5: Reverter registro após cancelamento confirmado (Feature 008)
```
Dado um registro de "Restauração" confirmado no dente 26, vinculado a um agendamento "iniciado"
Quando esse agendamento é cancelado com confirmação explícita (Feature 008, Cenário 6)
Então o sistema marca automaticamente o registro do dente 26 como "revertido"
E o registro permanece visível no histórico do odontograma, identificado como revertido (não é apagado)
```

### Cenário 6: Consultar histórico de um dente
```
Dado o dente 26 com múltiplos procedimentos ao longo do tempo (ex: Restauração em 2025, nova Restauração em 2026)
Quando o Dentista consulta o histórico desse dente
Então vê todos os procedimentos já realizados nele, em ordem cronológica
```

### Cenário 7: Editar registro já confirmado
```
Dado um registro confirmado no odontograma
Quando o Dentista edita diretamente esse registro (ex: corrige o procedimento vinculado)
Então o sistema salva a alteração no registro existente
E grava na trilha de auditoria (Feature 010) o autor, a data/hora e o conteúdo anterior
```

---

## Exemplos de Código

```typescript
interface RegistroOdontograma {
  id: string;
  paciente_id: string;
  dente: number; // numeração FDI
  quadrante: 'superior_direito' | 'superior_esquerdo' | 'inferior_esquerdo' | 'inferior_direito';
  procedimento_id: string; // referência à Feature 005
  agendamento_id: string; // referência ao agendamento de origem (Feature 006)
  protese_id?: string; // referência à Feature 016, se aplicável
  status: 'confirmado' | 'revertido';
  registrado_por: string; // usuario_id — Dentista ou Admin
  registrado_em: string;
}

// Exemplo de uso esperado
await odontogramaService.registrarProcedimento({
  paciente_id: 'paciente-001',
  dente: 26,
  procedimento_id: 'procedimento-restauracao',
  agendamento_id: 'agendamento-020',
  registrado_por: 'dentista-005'
});

// Consultar histórico de um dente específico
await odontogramaService.historicoPorDente({
  paciente_id: 'paciente-001',
  dente: 26
});
```

---

## Dependências

- Feature 005 (Criar Procedimento) — procedimentos vinculados aos dentes
- Feature 008 (Cancelar Agendamento) — dispara a reversão. Integração bidirecional: a 008 é implementada antes, e a reversão entra quando esta feature existir
- Feature 010 (Prontuário Básico) — odontograma faz parte do prontuário; edições entram na trilha de auditoria
- Feature 012 (Plano de Tratamento) — itens do plano são vinculados a dentes
- Feature 015 (Raio X & Imagens) — vínculo opcional de imagens ao dente (V1.5)
- Feature 016 (Controle de Prótese) — próteses exibidas no odontograma (V1.5; integração bidirecional, entra com a 016 via interface temporária)

---

## Regras de Negócio

- [stated] Feature separada, mas parte do prontuário do paciente
- [stated] Divisão por quadrantes: superior direito, superior esquerdo, inferior esquerdo, inferior direito
- [stated] Inversão de lados (reflete a visão do dentista de frente para o paciente)
- [stated] Vincula procedimentos específicos por dente: Restauração, Endodontia, Extração, Implante, Coroa
- [stated] Registrar procedimento no dente NÃO reduz estoque — a baixa acontece na conclusão do atendimento (substitui a regra anterior "Ao vincular procedimento ao dente, reduz estoque")
- [stated] Próteses aparecem no odontograma com todas as informações
- [stated] Edição de registro confirmado é permitida, mas gera registro na trilha de auditoria (Feature 010)
- [stated] Com a confirmação explícita no cancelamento (Feature 008), o registro é marcado como `revertido` automaticamente
- [correção] Registro no odontograma nunca é apagado; quando um cancelamento confirmado exige reversão (Feature 008), o registro é marcado como "revertido" e permanece no histórico
- [correção] Numeração de dentes segue o padrão FDI
- [correção] Cada dente mantém histórico completo de operações já realizadas nele
- [correção] Imagens (Feature 015) podem ser vinculadas diretamente a um dente, com descrição detalhada

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Quando um item do Plano de Tratamento (Feature 012), que já tem dente(s), é concluído, o registro no odontograma é criado automaticamente ou o Dentista registra manualmente?
- ⚠️ É possível registrar no odontograma um procedimento pré-existente (ex: restauração feita em outra clínica) sem agendamento de origem? Hoje `agendamento_id` é obrigatório

---

## Notas

**Histórico:** 2026-10-02 — aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: PEN-02, INC-02, INC-05, INC-08, ESC-06, ESC-07). O antigo Cenário 2 ("dedução de estoque ao confirmar procedimento no dente") foi substituído.
