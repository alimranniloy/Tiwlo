import { jsonScalar } from './jsonScalar.js';

export const mergeResolvers = (...modules) => {
  const merged = { JSON: jsonScalar, Query: {}, Mutation: {} };

  for (const moduleResolvers of modules) {
    if (!moduleResolvers) continue;
    for (const [key, value] of Object.entries(moduleResolvers)) {
      if (key === 'Query' || key === 'Mutation') {
        merged[key] = { ...merged[key], ...value };
      } else {
        merged[key] = { ...(merged[key] || {}), ...value };
      }
    }
  }

  return merged;
};
