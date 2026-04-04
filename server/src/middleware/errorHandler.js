export function errorHandler(err, req, res, _next) {
  console.error('Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  const status = err.status || 500;
  res.status(status).json({
    error: true,
    message: process.env.NODE_ENV === 'production' && status === 500
      ? 'Interner Serverfehler'
      : err.message,
  });
}
