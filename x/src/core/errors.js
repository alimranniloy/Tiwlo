export class AppError extends Error {
  constructor(message, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'AppError';
    this.extensions = { code };
  }
}

export const forbidden = (message = 'You do not have permission to perform this action') => {
  throw new AppError(message, 'FORBIDDEN');
};

export const unauthorized = (message = 'Authentication is required') => {
  throw new AppError(message, 'UNAUTHENTICATED');
};

export const notFound = (resource = 'Resource') => {
  throw new AppError(`${resource} was not found`, 'NOT_FOUND');
};
