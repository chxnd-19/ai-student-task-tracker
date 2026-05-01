const multer = require('multer');

/**
 * Global error handler — registered last in server.js.
 * Standardizes ALL unhandled errors to { success, message } shape.
 */
const errorHandler = (err, req, res, next) => {
  // Mongo duplicate key (e.g. User.email unique constraint)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already registered.`,
    });
  }

  // Multer file size limit exceeded
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5 MB.',
    });
  }

  // Multer wrong file type (thrown from fileFilter)
  if (err.isFileTypeError || err.message === 'Only PDF files are allowed.') {
    return res.status(400).json({ success: false, message: 'Only PDF files are allowed.' });
  }

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
