// Wraps async route handlers so thrown errors reach the error middleware.
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const httpError = (status, message) => Object.assign(new Error(message), { status });

export const slugify = (s) =>
  s.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function notFound(req, res) {
  res.status(404).json({ message: `Not found: ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  if (err.code === 11000) {
    status = 400;
    message = `${Object.keys(err.keyValue || {}).join(', ') || 'Value'} already exists`;
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') status = 400;
  if (err.name === 'MulterError') status = 400;
  if (status === 500) console.error(err);
  res.status(status).json({ message });
}
