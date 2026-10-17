// Regras do nome de usuário, usadas na validação do servidor e no formulário de boas-vindas.
export const USERNAME_RULES = [
  ['length', 'De 3 a 30 caracteres'],
  ['characters', 'Só letras sem acento, números, ponto e underline'],
];

export const USERNAME_MESSAGES = {
  length: 'Use de 3 a 30 caracteres.',
  characters: 'Use só letras sem acento, números, ponto e underline.',
};

export function checkUsername(nome = '') {
  return {
    length: nome.length >= 3 && nome.length <= 30,
    characters: /^[a-zA-Z0-9._]+$/.test(nome),
  };
}
