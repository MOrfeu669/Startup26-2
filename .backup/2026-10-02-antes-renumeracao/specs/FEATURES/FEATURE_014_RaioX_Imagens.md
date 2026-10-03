# Feature 014: Raio X & Imagens

**Status:** 🟡 Em Definição
**Fase:** V1.5
**Complexidade:** 🟢 Baixa
**Dependências:** Feature 010, Feature 011 (vínculo opcional ao dente)

---

## Contexto

O Dentista precisa anexar imagens (principalmente raio X) ao prontuário do paciente, criando um histórico visual do tratamento ao longo do tempo.

---

## Requisitos

- [ ] Apenas o Dentista pode adicionar imagens ao prontuário
- [ ] Não há restrição de formato de arquivo aceito
- [ ] Não há tamanho máximo por imagem
- [ ] Cada imagem possui descrição detalhada: paciente, dente relacionado (quando aplicável) e tipo de caso
- [ ] Cada imagem fica vinculada ao paciente e, idealmente, à data/consulta em que foi tirada
- [ ] Sistema permite visualizar galeria de imagens do paciente em ordem cronológica
- [ ] Imagem pode ser excluída pelo Dentista, mas permanece recuperável por um prazo de segurança de 3 meses antes da exclusão definitiva

---

## Cenários

### Cenário 1: Dentista anexa imagem de raio X
```
Dado um paciente com prontuário existente
Quando o Dentista faz upload de uma imagem de raio X vinculada à consulta atual, com descrição do dente e tipo de caso
Então o sistema salva a imagem no prontuário do paciente
```

### Cenário 2: Recepcionista tenta anexar imagem
```
Dado uma Recepcionista autenticada
Quando ela tenta anexar uma imagem ao prontuário de um paciente
Então o sistema bloqueia a ação, pois é exclusiva do Dentista
```

### Cenário 3: Visualizar galeria de imagens
```
Dado um paciente com 4 imagens de raio X registradas em datas diferentes
Quando o Dentista abre a seção de imagens do prontuário
Então vê as 4 imagens ordenadas cronologicamente, cada uma com sua descrição (paciente, dente, tipo de caso)
```

### Cenário 4: Excluir imagem com prazo de segurança
```
Dado uma imagem de raio X registrada no prontuário
Quando o Dentista exclui essa imagem
Então o sistema move a imagem para exclusão pendente, mantendo-a recuperável por 3 meses
E após os 3 meses, a imagem é removida definitivamente
```

---

## Exemplos de Código

```typescript
interface ImagemProntuario {
  id: string;
  paciente_id: string;
  agendamento_id?: string;
  dente?: number; // referência opcional ao dente (Feature 011), numeração FDI
  tipo_caso: string;
  descricao: string;
  url_arquivo: string;
  adicionado_por: string; // sempre um dentista_id
  adicionado_em: string;
  excluido_em?: string; // início do prazo de segurança de 3 meses
  remocao_definitiva_em?: string; // excluido_em + 3 meses
}

// Exemplo de uso esperado
await imagemService.adicionar({
  paciente_id: 'paciente-001',
  agendamento_id: 'agendamento-020',
  dente: 26,
  tipo_caso: 'Raio X periapical',
  descricao: 'Avaliação pré-restauração do dente 26',
  url_arquivo: 'https://storage/.../imagem.png',
  adicionado_por: 'dentista-005'
});
```

---

## Dependências

- Feature 010 (Prontuário Básico) — imagens fazem parte da estrutura do prontuário
- Feature 011 (Odontograma) — vínculo opcional ao dente

---

## Regras de Negócio

- [stated] Raio X faz parte do prontuário (seção "Raio X e imagens")
- [stated] Apenas o Dentista preenche essa seção
- [correção] Sem restrição de formato de arquivo
- [correção] Sem tamanho máximo de imagem
- [correção] Imagem é vinculada ao dente relacionado (quando aplicável), com descrição detalhada (paciente, dente, tipo de caso)
- [correção] Exclusão de imagem tem prazo de segurança de 3 meses antes da remoção definitiva

---

## Notas

Existe integração direta com a Feature 011 (Odontograma), já que a imagem é vinculada ao dente relacionado quando aplicável.
