import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

// Global error handling middleware. Mount as the last app.use() call in app.ts.
// Catches any error passed to next(err) and returns a typed JSON error response.
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? 'Internal server error.';

  console.error(
    `[${new Date().toISOString()}] ERROR ${statusCode}: ${message}`
  );

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.code ? { code: err.code } : {}),
  });
}
