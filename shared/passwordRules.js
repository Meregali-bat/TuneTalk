// Regras de senha usadas tanto na validação do servidor quanto no formulário de cadastro.
export const PASSWORD_RULES_MESSAGE =
  'A senha deve conter pelo menos um símbolo, mais de 6 caracteres e uma letra maiúscula.';

export function checkPassword(senha = '') {
  return {
    length: senha.length >= 6,
    uppercase: /[A-Z]/.test(senha),
    symbol: /\W/.test(senha),
  };
}

export function isPasswordValid(senha) {
  return Object.values(checkPassword(senha ?? '')).every(Boolean);
}
