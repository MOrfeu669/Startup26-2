# Feature 014: Documentos

**Status:** 🟡 Em Definição
**Fase:** V1.5
**Complexidade:** 🟡 Média
**Dependências:** Feature 001, Feature 004, Feature 010

---

## Contexto

A clínica precisa gerar documentos padronizados para o paciente (receita, atestado, termo de consentimento), com assinatura digital do dentista, e também poder personalizar novos modelos além dos padrões oferecidos pelo sistema.

---

## Requisitos

- [ ] Sistema oferece modelos padrão: Receituário, Atestado, Termo de Consentimento
- [ ] Dentista e Admin podem criar modelo personalizado além dos padrões
- [ ] Apenas o **Dentista gera** documentos, e o **mesmo Dentista assina** — a Recepcionista não gera documentos
- [ ] Documentos gerados são exportados em formato PDF
- [ ] Documentos possuem assinatura digital do Dentista que os gerou
- [ ] Variáveis dinâmicas disponíveis nos modelos: dados reutilizáveis do paciente e do dentista (nome, CPF, data de nascimento, etc.)
- [ ] Modelos personalizados são criados por Dentista específico, mas podem ser compartilhados/importados por outros dentistas da clínica
- [ ] Documento gerado é vinculado ao paciente e preenchido com seus dados automaticamente
- [ ] Documento gerado fica registrado no prontuário do paciente (Feature 010)
- [ ] Cada documento gerado registra autor e data/hora de geração (base para a trilha de auditoria da Feature 010)
- [ ] Documento já gerado não é editável diretamente — uma correção gera um novo documento, mantendo o anterior no histórico

---

## Cenários

### Cenário 1: Gerar documento a partir de modelo padrão
```
Dado o paciente "João" com prontuário existente
Quando o Dentista gera um "Atestado" usando o modelo padrão
Então o sistema preenche os dados do paciente automaticamente no documento
E gera o arquivo em PDF com assinatura digital do Dentista
E salva o documento gerado no histórico do prontuário
```

### Cenário 2: Criar modelo personalizado
```
Dado um Dentista com permissão para gerar documentos
Quando ele opta por "Personalizar" e cria um novo modelo de documento com variáveis dinâmicas (nome, CPF, data de nascimento)
Então o sistema salva esse modelo como disponível para uso futuro, vinculado a esse Dentista
```

### Cenário 3: Compartilhar modelo personalizado com outro dentista
```
Dado um modelo personalizado criado por um Dentista
Quando outro Dentista da mesma clínica importa esse modelo
Então ele passa a ter acesso ao modelo para gerar seus próprios documentos
```

### Cenário 4: Recepcionista não gera documento
```
Dado uma Recepcionista autenticada
Quando ela tenta gerar um Termo de Consentimento para um paciente
Então o sistema bloqueia a ação, pois gerar e assinar documentos é exclusivo do Dentista
```

### Cenário 5: Corrigir documento já gerado
```
Dado um Atestado já gerado para um paciente com um erro de digitação
Quando o Dentista corrige e gera novamente o documento
Então o sistema cria um novo registro de documento em PDF, com nova assinatura digital
E mantém o documento anterior no histórico do prontuário, para fins de auditoria (Feature 010)
```

---

## Exemplos de Código

```typescript
interface ModeloDocumento {
  id: string;
  clinica_id: string;
  criado_por: string; // usuario_id — Dentista ou Admin
  compartilhado: boolean; // true = outros dentistas podem importar
  nome: string;
  tipo: 'padrao' | 'personalizado';
  conteudo_template: string; // com variáveis, ex: {{paciente.nome}}, {{paciente.cpf}}, {{dentista.nome}}
}

interface DocumentoGerado {
  id: string;
  modelo_id: string;
  paciente_id: string;
  conteudo_final: string;
  arquivo_pdf_url: string;
  assinatura_digital: string; // assinatura do mesmo dentista que gerou o documento
  gerado_por: string; // dentista_id — quem gera é quem assina
  gerado_em: string;
}

// Exemplo de uso esperado
const documento = await documentoService.gerar({
  modelo_id: 'modelo-atestado-padrao',
  paciente_id: 'paciente-001',
  gerado_por: 'dentista-005'
});
```

---

## Dependências

- Feature 001 (Autenticação & Roles) — permissões de quem gera documentos
- Feature 004 (Cadastro de Pacientes) — dados usados para preencher o documento
- Feature 010 (Prontuário Básico) — documento gerado fica registrado no prontuário

---

## Regras de Negócio

- [stated] Existem modelos padrão: Receituário, Atestado, Termo de Consentimento
- [stated] Opção "Personalizar" permite criar novo modelo
- [stated] O Dentista gera o documento e o próprio Dentista assina; a Recepcionista não gera documentos (substitui a regra anterior "Dentista e Recepcionista podem gerar documentos")
- [stated] Dentista e Admin podem criar modelos personalizados
- [correção] Documento gerado é imutável: correções geram um novo documento, preservando o anterior — essa cadeia de documentos alimenta a trilha de auditoria do prontuário (Feature 010)
- [correção] Formato de saída é sempre PDF
- [correção] Documentos possuem assinatura digital do Dentista
- [correção] Variáveis dinâmicas são dados reutilizáveis do paciente e do dentista (nome, CPF, data de nascimento, etc.)
- [correção] Modelos personalizados pertencem a um Dentista específico, mas podem ser compartilhados/importados por outros dentistas da clínica

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Qual provedor/mecanismo de assinatura digital será usado?
- ⚠️ O Admin pode gerar e assinar documentos (pela hierarquia da Feature 001), ou só um Dentista com CRO assina?
- ⚠️ Onde os PDFs ficam armazenados (provedor de storage ainda não definido)?

---

## Notas

**Histórico:** 2026-10-02 — renumerada de 013 para 014; aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: INC-13). O Cenário 4 passou de "Recepcionista gera documento" para "Recepcionista não gera documento".
