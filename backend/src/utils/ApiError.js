// Structured error for the API error shape defined in the backend todo:
// { "error": { "code": "STRING_CODE", "message": "human readable", "details": {} } }
//
// Throw this from routes/controllers/services; the central error handler
// (src/middleware/errorHandler.js) turns it into the response above.

export class ApiError extends Error {
  constructor(statusCode, code, message, details = {}) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static unauthenticated(message = "Authentication required", details = {}) {
    return new ApiError(401, "UNAUTHENTICATED", message, details);
  }

  static forbidden(message = "Not allowed", details = {}) {
    return new ApiError(403, "FORBIDDEN", message, details);
  }

  static notFound(message = "Not found", details = {}) {
    return new ApiError(404, "NOT_FOUND", message, details);
  }

  static validationFailed(message = "Validation failed", details = {}) {
    return new ApiError(400, "VALIDATION_FAILED", message, details);
  }

  static conflict(message = "Conflict", details = {}) {
    return new ApiError(409, "CONFLICT", message, details);
  }

  static rateLimited(message = "Too many requests", details = {}) {
    return new ApiError(429, "RATE_LIMITED", message, details);
  }

  static upstreamFailed(message = "Upstream service failed", details = {}) {
    return new ApiError(502, "UPSTREAM_FAILED", message, details);
  }

  static internal(message = "Internal server error", details = {}) {
    return new ApiError(500, "INTERNAL", message, details);
  }
}
