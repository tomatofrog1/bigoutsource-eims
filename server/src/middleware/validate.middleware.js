import { AppError } from '../utils/apiResponse.js';

export function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value === undefined || value === null || value === '') continue;

      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be a ${rules.type}`);
      }

      if (rules.min && String(value).length < rules.min) {
        errors.push(`${field} must be at least ${rules.min} characters`);
      }

      if (rules.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${field} must be a valid email`);
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(rules.message || `${field} is invalid`);
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
    }

    if (errors.length) {
      return next(new AppError(errors.join(', '), 400));
    }

    return next();
  };
}
