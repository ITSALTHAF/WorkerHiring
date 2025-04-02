import asyncHandler from '../middleware/async.js';

// Wrapper for async middleware to avoid try/catch blocks
export default fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
