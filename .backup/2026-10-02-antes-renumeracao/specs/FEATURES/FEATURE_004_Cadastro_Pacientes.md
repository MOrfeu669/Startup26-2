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

- [ ] Todos os papéis (Admin, Dentista, Recepcionista) podem cadastrar paciente
- [ ] Cadastro captura: nome completo (único campo obrigatório), telefone, email, CPF, endereço, idade, aniversário, sexo
- [ ] Sexo aceita as opções: masculino, feminino, outro
- [ ] CPF é único por clínica quando informado: sistema bloqueia novo cadastro se já existir paciente com o mesmo CPF, indicando o registro existente
- [ ] Cadastro captura dados do responsável legal (nome completo e CPF, obrigatórios; telefone opcional) quando o paciente é menor de idade
- [ ] Paciente fica vinculado à clínica que o cadastrou
- [ ] Paciente cadastrado fica disponível para seleção em agendamentos (Feature 006) e prontuário (Feature 010)
- [ ] Dados podem ser editados posteriormente

---

## Cenários

### Cenário 1: Cadastrar paciente com dados completos
```
Dado uma Recepcionista autenticada
Quando ela cadastra um paciente informando nome, telefone, email, CPF, endereço, aniversário e sexo
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
Dado um usuário cadastrando um paciente com data de nascimento que resulta em idade menor de 18 anos
Quando ele informa nome completo e CPF do responsável legal
Então o sistema salva os dados do responsável vinculados ao paciente
```

### Cenário 7: Cadastro apenas com nome completo
```
Dado um usuário cadastrando um novo paciente
Quando ele informa apenas o nome completo, sem os demais dados
Então o sistema cria o registro do paciente normalmente
```

---

## Exemplos de Código

```typescript
interface Paciente {
  id: string;
  clinica_id: string;
  nome: string; // único campo obrigatório
  telefone?: string;
  email?: string;
  cpf?: string; // único por clínica, quando informado
  endereco?: string;
  data_nascimento?: string; // usada para calcular idade
  sexo?: 'masculino' | 'feminino' | 'outro';
  responsavel_legal?: ResponsavelLegal; // obrigatório quando menor de idade
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
  telefone: '(54) 99999-0000',
  cpf: '000.000.000-00',
  endereco: 'Rua das Flores, 123',
  data_nascimento: '1990-05-10',
  sexo: 'masculino'
});

// Exemplo com responsável legal (paciente menor de idade)
const pacienteMenor = await pacienteService.cadastrar({
  clinica_id: 'clinica-001',
  nome: 'Maria Pereira',
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
- [stated] Paciente não tem acesso a nenhuma informação do sistema (não é usuário autenticado)
- [correção] Único dado obrigatório no cadastro é o nome completo — os demais campos são opcionais
- [correção] Opções de sexo: masculino, feminino, outro
- [correção] CPF é único por clínica quando informado: sistema bloqueia cadastro duplicado e aponta o registro existente
- [correção] Paciente menor de idade requer nome completo e CPF do responsável legal (telefone é opcional)
- [correção] Versão futura permitirá exportar a lista de pacientes (fora do escopo do MVP)

### ⚠️ PENDENTE (não definido ainda pelo usuário)
- ⚠️ Paciente pode ser transferido entre clínicas (se o sistema suportar múltiplas clínicas) ou o cadastro é exclusivo de uma clínica?
- ⚠️ Responsável legal também precisa ter CPF único validado, ou pode repetir entre irmãos (mesmo responsável, pacientes diferentes)?

---

## Notas

Este cadastro cobre apenas a "Visão Geral" do Prontuário. As demais seções (Anamnese, Odontograma, Raio X, Evolução, Documentos, Débitos) são especificadas em features próprias, todas dependentes deste cadastro básico existir primeiro.
