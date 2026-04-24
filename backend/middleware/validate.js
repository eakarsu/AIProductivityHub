const { body, param, query, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

const validateRegister = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6, max: 128 }).withMessage('Password must be 6-128 characters'),
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required'),
  handleValidation
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation
];

const validateBookmark = [
  body('title').trim().isLength({ min: 1, max: 500 }).withMessage('Title is required (max 500 chars)'),
  body('url').isURL().withMessage('Valid URL is required'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description max 2000 chars'),
  body('category').optional().isLength({ max: 100 }),
  handleValidation
];

const validateFile = [
  body('filename').trim().isLength({ min: 1, max: 500 }).withMessage('Filename is required'),
  body('filepath').trim().isLength({ min: 1 }).withMessage('Filepath is required'),
  handleValidation
];

const validatePassword = [
  body('site_name').trim().isLength({ min: 1, max: 255 }).withMessage('Site name is required'),
  body('site_url').optional().isURL().withMessage('Valid URL required'),
  body('username').optional().isLength({ max: 255 }),
  handleValidation
];

const validateScreenTime = [
  body('app_name').trim().isLength({ min: 1, max: 255 }).withMessage('App name is required'),
  body('category').optional().isLength({ max: 100 }),
  body('daily_limit_minutes').optional().isInt({ min: 0, max: 1440 }),
  body('actual_usage_minutes').optional().isInt({ min: 0, max: 1440 }),
  handleValidation
];

const validateFocusSession = [
  body('session_name').trim().isLength({ min: 1, max: 255 }).withMessage('Session name is required'),
  body('duration_minutes').isInt({ min: 1, max: 480 }).withMessage('Duration 1-480 minutes'),
  handleValidation
];

const validateFeedback = [
  body('subject').trim().isLength({ min: 1, max: 255 }).withMessage('Subject is required'),
  body('message').trim().isLength({ min: 1, max: 5000 }).withMessage('Message is required'),
  body('type').optional().isIn(['general', 'bug', 'feature', 'improvement']),
  body('rating').optional().isInt({ min: 1, max: 5 }),
  handleValidation
];

const validateContact = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('subject').trim().isLength({ min: 1, max: 255 }).withMessage('Subject is required'),
  body('message').trim().isLength({ min: 1, max: 5000 }).withMessage('Message is required'),
  handleValidation
];

const validateProfileUpdate = [
  body('name').optional().trim().isLength({ min: 1, max: 255 }),
  body('bio').optional().isLength({ max: 1000 }),
  body('phone').optional().isLength({ max: 50 }),
  body('timezone').optional().isLength({ max: 100 }),
  body('language').optional().isLength({ max: 10 }),
  handleValidation
];

const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6, max: 128 }).withMessage('New password must be 6-128 characters'),
  handleValidation
];

const validateId = [
  param('id').isInt({ min: 1 }).withMessage('Valid ID is required'),
  handleValidation
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('search').optional().isLength({ max: 255 }),
  handleValidation
];

module.exports = {
  validateRegister,
  validateLogin,
  validateBookmark,
  validateFile,
  validatePassword,
  validateScreenTime,
  validateFocusSession,
  validateFeedback,
  validateContact,
  validateProfileUpdate,
  validatePasswordChange,
  validateId,
  validatePagination
};
