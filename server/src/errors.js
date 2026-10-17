export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const unauthorized = (message = 'Não autenticado.') => new HttpError(401, message);
export const forbidden = (message = 'Ação não permitida.') => new HttpError(403, message);
export const notFound = (message = 'Não encontrado.') => new HttpError(404, message);
export const conflict = (message) => new HttpError(409, message);
export const badGateway = (message) => new HttpError(502, message);
