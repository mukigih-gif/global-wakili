// apps/api/src/utils/async-handler.ts

import type { NextFunction, Request, RequestHandler, Response } from 'express';

export type AsyncRouteHandler<
  TRequest extends Request = Request,
  TResponse extends Response = Response,
> = (
  req: TRequest,
  res: TResponse,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler<TRequest extends Request = Request>(
  fn: AsyncRouteHandler<TRequest>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as TRequest, res, next)).catch(next);
  };
}

export default asyncHandler;