// Mesma regra no cadastro e na troca de email (servidor e tela).
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Emails são guardados em minúsculas, sem espaços nas pontas.
export const limparEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

export const emailValido = (email) => EMAIL_PATTERN.test(limparEmail(email));
