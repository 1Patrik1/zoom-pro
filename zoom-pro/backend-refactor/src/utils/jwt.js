import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '8h' });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
