# Feature 004: Cadastro de Pacientes

**Status:** 🟡 Em Definição
**Fase:** MVP
**Complexidade:** 🟡 Média
**Dependências:** Feature 001 (Autenticação & Roles), Feature 002 (Criar/Configurar Clínica)

---

## Contexto

Todo agendamento (Feature 006) precisa de um paciente vinculado. O paciente não é um usuário autenticado do sistema (confirmado na Feature 001) — ele é apenas um registro de dados gerenciado pela clínica.

Este cadastro corresponde à "Visão Geral" do Prontuário (Feature 010): os dados pessoais básicos do paciente. As demais seções do prontuário (anamnese, odontograma, histórico, etc.) são preenchidas depois, em outras features.

---

## Requisitos

- [ ] Todos os papéis (Admin, Dentista, Recepcionista) podem cadastrar paciente e editar a Visão Geral
- [ ] Cadastro exige: **nome completo** e **pelo menos um canal de comunicação** indicado pelo paciente
- [ ] Cadastro captura opcionalmente: CPF, endereço, data de nascimento (aniversário), sexo
- [ ] Canal de comunicação: tipo (SMS, Email ou WhatsApp) + contato (telefone ou email); o paciente pode ter **vários canais**, com **exatamente um marcado como preferido**
- [ ] O canal é **indicado pelo paciente** à clínica e **registrado pela clínica** (o paciente não acessa o sistema)
- [ ] Idade não é um campo: é sempre **calculada** a partir da data de nascimento
- [ ] Sexo aceita as opções: masculino, feminino, outro
- [ ] CPF é único por clínica quando informado: sistema bloqueia novo cadastro se já existir paciente com o mesmo CPF, indicando o registro existente
- [ ] Quando a data de nascimento é informada e resulta em idade menor de 18 anos, o cadastro exige os dados do responsável legal (nome completo e CPF obrigatórios; telefone opcional). Sem data de nascimento, não há exigência
- [ ] Paciente é exclusivo da clínica que o cadastrou (não é transferido nem compartilhado entre clínicas)
- [ ] Lista de cadastros de pacientes pode ser exportada e importada (ver PENDENTE)
- [ ] Paciente cadastrado fica disponível para seleção em agendamentos (Feature 006) e prontuário (Feature 010)
- [ ] Dados podem ser editados posteriormente

---

## Cenários

### Cenário 1: Cadastrar paciente com dados completos
```
Dado uma Recepcionista autenticada
Quando ela cadastra um paciente informando nome, canal WhatsApp preferido, email, CPF, endereço, aniversário e sexo
Então o sistema cria o registro do paciente vinculado à clínica
```

### Cenário 2: Paciente cadastrado aparece disponível para agendamento
```
Dado um paciente recém-cadastrado
Quando qualquer usuário cria um agendamento
Então esse paciente aparece na busca/seleção de pacientes
```

### Cenário 3: Editar dados do paciente
```
Dado um paciente já cadastrado
Quando o Dentista atualiza o telefone de contato dele
Então o sistema salva a alteração mantendo o histórico de agendamentos e prontuário já existentes
```

### Cenário 4: Idade calculada a partir do aniversário
```
Dado um paciente cadastrado com data de aniversário "1990-05-10"
Quando o sistema exibe os dados do paciente
Então a idade é calculada automaticamente a partir da data de aniversário
```

### Cenário 5: Bloquear cadastro com CPF duplicado
```
Dado um paciente "João Pereira" já cadastrado com CPF "000.000.000-00"
Quando um usuário tenta cadastrar um novo paciente com o mesmo CPF
Então o sistema bloqueia o novo cadastro
E informa o registro do paciente já existente
```

### Cenário 6: Cadastrar paciente menor de idade com responsável legal
```
Dado um usuário cadastrando um paciente com data de nascimento informada que resulta em idade menor de 18 anos
Quando ele informa nome completo e CPF do responsável legal
Então o sistema salva os dados do responsável vinculados ao paciente
```

### Cenário 7: Cadastro mínimo (nome + um canal)
```
Dado um usuário cadastrando um novo paciente
Quando ele informa apenas o nome completo e um canal de comunicação (ex: WhatsApp "(54) 99999-0000")
Então o sistema cria o registro do paciente normalmente
E esse canal fica marcado como preferido
```

### Cenário 8: Bloquear cadastro sem canal de comunicação
```
Dado um usuário cadastrando um novo paciente
Quando ele informa apenas o nome completo, sem nenhum canal de comunicação
Então o sistema bloqueia o cadastro e exige pelo menos um canal
```

---

## Exemplos de Código

```typescript
interface Paciente {
  id: string;
  clinica_id: string;
  nome: string; // obrigatório
  canais_comunicacao: CanalComunicacao[]; // obrigatório: pelo menos 1, exatamente 1 preferido
  cpf?: string; // único por clínica, quando informado
  endereco?: string;
  data_nascimento?: string; // idade é sempre calculada a partir dela
  sexo?: 'masculino' | 'feminino' | 'outro';
  responsavel_legal?: ResponsavelLegal; // obrigatório quando data_nascimento indica menor de 18
}

interface CanalComunicacao {
  canal: 'sms' | 'email' | 'whatsapp';
  contato: string; // telefone ou email, conforme o canal
  preferido: boolean; // mensagens automáticas (Feature 020) vão só pelo preferido
}

interface ResponsavelLegal {
  nome: string;
  cpf: string;
  telefone?: string;
}

// Exemplo de uso esperado
const paciente = await pacienteService.cadastrar({
  clinica_id: 'clinica-001',
  nome: 'João Pereira',
  canais_comunicacao: [
    { canal: 'whatsapp', contato: '(54) 99999-0000', preferido: true },
    { canal: 'email', contato: 'joao@email.com', preferido: false }
  ],
  cpf: '000.000.000-00',
  endereco: 'Rua das Flores, 123',
  data_nascimento: '1990-05-10',
  sexo: 'masculino'
});

// Exemplo com responsável legal (paciente menor de idade)
const pacienteMenor = await pacienteService.cadastrar({
  clinica_id: 'clinica-001',
  nome: 'Maria Pereira',
  canais_comunicacao: [{ canal: 'sms', contato: '(54) 98888-0000', preferido: true }],
  data_nascimento: '2015-03-20',
  sexo: 'feminino',
  responsavel_legal: {
    nome: 'João Pereira',
    cpf: '000.000.000-00'
  }
});
```

---

## Dependências

- Feature 001 (Autenticação & Roles) — determina quem pode cadastrar paciente
- Feature 002 (Criar/Configurar Clínica) — paciente é vinculado a uma clínica já existente

---

## Regras de Negócio

- [stated] Campos da Visão Geral: telefone, email, CPF, endereço, idade, aniversário, sexo
- [stated] Todos os papéis podem cadastrar/editar prontuário (regra de MVP; Admin gerencia permissões específicas em versões futuras)
- [stated] "Todos os papéis editam o prontuário" vale apenas para a Visão Geral (dados cadastrais desta feature); seções clínicas seguem as regras de cada feature
- [stated] Paciente não tem acesso a nenhuma informação do sistema (não é usuário autenticado)
- [stated] Dados obrigatórios no cadastro: nome completo e pelo menos um canal de comunicação indicado pelo paciente; os demais campos são opcionais
- [stated] Paciente pode ter vários canais de comunicação, com um marcado como preferido
- [stated] Idade é sempre calculada a partir da data de nascimento (não é campo armazenado)
- [stated] Responsável legal só é exigido quando a data de nascimento é informada e resulta em menos de 18 anos
- [stated] Pacientes são exclusivos da clínica; a lista de cadastros pode ser exportada e importada
- [stated] 2026-10-05 — CPF do responsável legal **pode repetir** na mesma clínica (irmãos com o mesmo responsável)
- [correção] Opções de sexo: masculino, feminino, outro
- [correção] CPF é único por clínica quando informado: sistema bloqueia cadastro duplicado e aponta o registro existente
- [correção] Paciente menor de idade requer nome completo e CPF do responsável legal (telefone é opcional)

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Exportação/importação da lista de pacientes: em que fase entra, qual formato de arquivo, se leva só a Visão Geral ou também dados clínicos, e o que acontece ao importar um CPF que já existe na clínica de destino (fora do MVP)

---

## Notas

Este cadastro cobre apenas a "Visão Geral" do Prontuário. As demais seções (Anamnese, Odontograma, Raio X, Evolução, Documentos, Débitos) são especificadas em features próprias (010, 011, 015, 014 e 013), todas dependentes deste cadastro básico existir primeiro.

**Histórico:** 2026-10-02 — aplicadas decisões da análise de consistência (`context/ANALISE_SPECS.md`: PEN-01, INC-02, INC-03, INC-10). A regra anterior "único campo obrigatório é o nome completo" foi substituída por "nome + pelo menos um canal". 2026-10-05 — Bernardo: CPF do responsável pode repetir; exportação/importação continua fora do MVP.
