// Central error handling, per backend todo "Error shape (all routes)".
// Mount notFoundHandler after every route, and errorHandler last of all.

import { ApiError } from "../utils/ApiError.js";

export function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const code = isApiError ? err.code : "INTERNAL";
  const message = isApiError ? err.message : "Internal server error";
  const details = isApiError ? err.details : {};

  if (!isApiError) {
    // Unexpected error: log the real cause server-side, never leak it to the client.
    console.error(err);
  }

  res.status(statusCode).json({
    error: { code, message, details },
  });
}
