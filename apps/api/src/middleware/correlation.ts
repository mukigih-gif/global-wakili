import { RequestHandler } from 'express';
import crypto from 'crypto';

export default function correlationId(): RequestHandler {
  return (req, res, next) => {
    const header = req.header('x-request-id');
    const id = typeof header === 'string' && header.trim().length > 0 ? header : crypto.randomUUID();
    req.headers['x-request-id'] = id;
    res.setHeader('x-request-id', id);
    next();
  };
}