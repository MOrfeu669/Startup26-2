# Feature 011: Odontograma

**Status:** 🟡 Em Definição
**Fase:** V1
**Complexidade:** 🔴 Alta
**Dependências:** Feature 005, Feature 008, Feature 010, Feature 016, Feature 015

---

## Contexto

O Odontograma é um mapa bucal: uma representação visual da boca do paciente, dividida em quadrantes, onde é possível visualizar cada dente e as operações já realizadas nele. O Dentista altera o odontograma conforme realiza procedimentos. É uma feature separada, mas visualmente integrada ao prontuário do paciente. Também é onde próteses (Feature 015) aparecem vinculadas a dentes específicos.

---

## Requisitos

- [ ] Representação anatômica/geométrica da boca dividida em 4 quadrantes: superior direito, superior esquerdo, inferior esquerdo, inferior direito
- [ ] Visão invertida (espelhada), refletindo a perspectiva do dentista de frente para o paciente
- [ ] Numeração de dentes segue o padrão FDI
- [ ] Dentista vincula procedimentos específicos a dentes (ex: Restauração, Endodontia, Extração, Implante, Coroa)
- [ ] Cada dente mantém histórico de operações realizadas nele, visualizável a qualquer momento
- [ ] Ao vincular um procedimento a um dente, o Dentista confirma o uso dos materiais vinculados, deduzindo do estoque (Feature 016)
- [ ] Registros no odontograma podem ser editados diretamente pelo Dentista
- [ ] Registro no odontograma possui status próprio (`confirmado` / `revertido`) para permitir reversão quando um agendamento vinculado é cancelado após confirmação (Feature 008)
- [ ] Imagens (Feature 014) podem ser vinculadas a um dente específico, com descrição detalhada
- [ ] Próteses (Feature 015) aparecem no odontograma com suas informações

---

## Cenários

### Cenário 1: Marcar procedimento em um dente
```
Dado o odontograma de um paciente
Quando o Dentista seleciona o dente 26 (numeração FDI, quadrante superior esquerdo) e vincula o procedimento "Restauração"
Então o sistema registra a restauração naquele dente específico
```

### Cenário 2: Dedução de estoque ao confirmar procedimento no dente
```
Dado o procedimento "Restauração" vinculado a 2 unidades de "Resina Composta" (Feature 005)
Quando o Dentista confirma a realização desse procedimento no dente 26
Então o sistema deduz 2 unidades de "Resina Composta" do estoque (Feature 016)
```

### Cenário 3: Visualização espelhada (perspectiva do dentista)
```
Dado o odontograma exibido em tela
Quando o Dentista visualiza o quadrante direito do paciente
Então o sistema exibe esse quadrante do lado esquerdo da tela (visão espelhada/invertida)
```

### Cenário 4: Prótese aparece no odontograma
```
Dado uma prótese registrada para o dente 16 (Feature 015)
Quando o Dentista abre o odontograma do paciente
Então vê a prótese indicada visualmente no dente 16, com suas informações
```

### Cenário 5: Reverter registro após cancelamento confirmado (Feature 008)
```
Dado um registro de "Restauração" confirmado no dente 26, vinculado a um agendamento
Quando esse agendamento é cancelado com confirmação explícita de reversão (Feature 008, Cenário 6)
Então o sistema marca o registro do dente 26 como "revertido"
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
Então o sistema salva a alteração diretamente no registro existente
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
  protese_id?: string; // referência à Feature 015, se aplicável
  status: 'confirmado' | 'revertido';
  registrado_por: string; // sempre um dentista_id
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
- Feature 008 (Cancelar Agendamento) — reversão de registro quando cancelamento confirmado exige reverter
- Feature 010 (Prontuário Básico) — odontograma faz parte do prontuário
- Feature 016 (Controle de Estoque) — dedução automática ao confirmar procedimento
- Feature 015 (Controle de Prótese) — próteses exibidas no odontograma

---

## Regras de Negócio

- [stated] Feature separada, mas parte do prontuário do paciente
- [stated] Divisão por quadrantes: superior direito, superior esquerdo, inferior esquerdo, inferior direito
- [stated] Inversão de lados (reflete a visão do dentista de frente para o paciente)
- [stated] Vincula procedimentos específicos por dente: Restauração, Endodontia, Extração, Implante, Coroa
- [stated] Ao vincular procedimento ao dente, reduz estoque (materiais vinculados ao procedimento)
- [stated] Próteses aparecem no odontograma com todas as informações
- [correção] Registro no odontograma nunca é apagado; quando um cancelamento confirmado exige reversão (Feature 008), o registro é marcado como "revertido" e permanece no histórico
- [correção] Numeração de dentes segue o padrão FDI
- [correção] Cada dente mantém histórico completo de operações já realizadas nele
- [correção] Registros confirmados podem ser editados diretamente pelo Dentista
- [correção] Imagens (Feature 014) podem ser vinculadas diretamente a um dente, com descrição detalhada
