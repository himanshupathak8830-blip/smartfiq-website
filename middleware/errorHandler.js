function errorHandler(err, req, res, next) {
  console.error('[SERVER ERROR]', {
    message: err.message,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'An internal server error occurred. Please try again later.';

  res.status(statusCode).json({
    success: false,
    error: message
  });
}

module.exports = errorHandler;
