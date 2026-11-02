import multer from 'multer';
import { HttpError, badRequest, forbidden, unauthorized } from '../errors.js';

// Express 4 não captura rejeições de handlers async; isto encaminha para o errorHandler.
export const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function requireAuth(req, res, next) {
  if (!req.session.user) return next(unauthorized());
  next();
}

// Quem acabou de criar a conta precisa escolher o nome de usuário antes de usar o resto do app.
export function requireUsername(req, res, next) {
  if (!req.session.user.nome) return next(forbidden('Escolha um nome de usuário para continuar.'));
  next();
}

export const currentUserId = (req) => req.session.user.id;

export function parseIdParam(req, res, next, value, name) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return next(badRequest(`Parâmetro "${name}" inválido.`));
  req.params[name] = id;
  next();
}

// A Vercel recusa requisições acima de 4,5 MB antes de chegar no app.
const FOTO_MAX_MB = 4;

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: FOTO_MAX_MB * 1024 * 1024 },
});

export async function uploadedImageUrl(uploader, file) {
  return file ? uploader.upload(file.buffer) : undefined;
}

export function apiNotFound(req, res) {
  res.status(404).json({ error: 'Rota não encontrada.' });
}

// Erros conhecidos do Prisma que representam falhas do cliente, não do servidor.
const PRISMA_ERRORS = {
  P2002: { status: 409, message: 'Registro duplicado.' },
  P2025: { status: 404, message: 'Não encontrado.' },
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof multer.MulterError) {
    const error = err.code === 'LIMIT_FILE_SIZE' ? `A foto pode ter no máximo ${FOTO_MAX_MB} MB.` : 'Arquivo inválido.';
    return res.status(400).json({ error });
  }
  const prismaError = PRISMA_ERRORS[err?.name === 'PrismaClientKnownRequestError' && err.code];
  if (prismaError) {
    return res.status(prismaError.status).json({ error: prismaError.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
}
