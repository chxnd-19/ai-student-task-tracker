/**
 * authorizeRoles(...roles)
 * Usage: router.post('/', protect, authorizeRoles('teacher'), createTask)
 *
 * Must be used AFTER the `protect` middleware so req.user is available.
 */
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. This action requires one of: ${roles.join(', ')}.`,
    });
  }
  next();
};

module.exports = authorizeRoles;
