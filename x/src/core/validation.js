import { AppError } from './errors.js';

export const assertRequired = (input, fields) => {
  const missing = fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === '');
  if (missing.length) throw new AppError(`Missing required field(s): ${missing.join(', ')}`, 'BAD_USER_INPUT');
};

export const assertOneOf = (value, allowed, field = 'status') => {
  if (value === undefined || value === null) return;
  if (!allowed.includes(value)) {
    throw new AppError(`${field} must be one of: ${allowed.join(', ')}`, 'BAD_USER_INPUT');
  }
};

export const pagination = ({ page = 1, limit = 50 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);
  return { take: safeLimit, skip: (safePage - 1) * safeLimit };
};

export const searchWhere = (search, fields) => {
  if (!search) return {};
  return {
    OR: fields.map((field) => ({ [field]: { contains: search, mode: 'insensitive' } }))
  };
};
