import { Formulario, type EstadoFormulario } from '../../formulario';
import type { Paciente, Sexo } from '@/modules/pacientes';

const SEXOS: { valor: Sexo; rotulo: string }[] = [
  { valor: 'masculino', rotulo: 'Masculino' },
  { valor: 'feminino', rotulo: 'Feminino' },
  { valor: 'outro', rotulo: 'Outro' },
];

function contato(paciente: Paciente | undefined, canal: 'whatsapp' | 'sms' | 'email'): string {
  return paciente?.canais_comunicacao.find((item) => item.canal === canal)?.contato ?? '';
}

function preferido(paciente: Paciente | undefined, canal: string): boolean {
  return paciente?.canais_comunicacao.some((item) => item.canal === canal && item.preferido) ?? canal === 'whatsapp';
}

/** Campos da Visão Geral. Um canal preenchido vira o preferido; com vários, o rádio marca o preferido. */
export function FormPaciente({
  action,
  paciente,
}: {
  action: (estado: EstadoFormulario | null, form: FormData) => Promise<EstadoFormulario | null>;
  paciente?: Paciente;
}) {
  return (
    <Formulario action={action}>
      {paciente ? <input type="hidden" name="id" value={paciente.id} /> : null}
      <label>
        Nome completo
        <input name="nome" defaultValue={paciente?.nome} required />
      </label>
      <fieldset>
        <legend>Canais de comunicação</legend>
        {(['whatsapp', 'sms', 'email'] as const).map((canal) => (
          <label key={canal}>
            <input type="radio" name="preferido" value={canal} defaultChecked={preferido(paciente, canal)} />
            {canal}
            <input name={`contato_${canal}`} defaultValue={contato(paciente, canal)} />
          </label>
        ))}
      </fieldset>
      <label>
        CPF
        <input name="cpf" defaultValue={paciente?.cpf} />
      </label>
      <label>
        Endereço
        <input name="endereco" defaultValue={paciente?.endereco} />
      </label>
      <label>
        Data de nascimento
        <input name="data_nascimento" type="date" defaultValue={paciente?.data_nascimento} />
      </label>
      <label>
        Sexo
        <select name="sexo" defaultValue={paciente?.sexo ?? ''}>
          <option value="">Não informado</option>
          {SEXOS.map((sexo) => (
            <option key={sexo.valor} value={sexo.valor}>
              {sexo.rotulo}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Responsável legal (obrigatório se a data indicar menos de 18 anos)</legend>
        <label>
          Nome
          <input name="responsavel_nome" defaultValue={paciente?.responsavel_legal?.nome} />
        </label>
        <label>
          CPF
          <input name="responsavel_cpf" defaultValue={paciente?.responsavel_legal?.cpf} />
        </label>
        <label>
          Telefone
          <input name="responsavel_telefone" defaultValue={paciente?.responsavel_legal?.telefone} />
        </label>
      </fieldset>
      <button type="submit">{paciente ? 'Salvar' : 'Cadastrar paciente'}</button>
    </Formulario>
  );
}
