// Error dengan status HTTP, ditangkap oleh middlewares/errorHandler.js
module.exports = function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};
