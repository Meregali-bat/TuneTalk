import multer from 'multer';
import { HttpError, badRequest, unauthorized } from '../errors.js';

// Express 4 não captura rejeições de handlers async; isto encaminha para o errorHandler.
export const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function requireAuth(req, res, next) {
  if (!req.session.user) return next(unauthorized());
  next();
}

export const currentUserId = (req) => req.session.user.id;

export function parseIdParam(req, res, next, value, name) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return next(badRequest(`Parâmetro "${name}" inválido.`));
  req.params[name] = id;
  next();
}

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
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
    return res.status(400).json({ error: 'Arquivo inválido.' });
  }
  const prismaError = PRISMA_ERRORS[err?.name === 'PrismaClientKnownRequestError' && err.code];
  if (prismaError) {
    return res.status(prismaError.status).json({ error: prismaError.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
}
