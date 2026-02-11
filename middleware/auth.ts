import { Response, NextFunction } from 'express';
import { IRequest } from '../types';

// Authentication middleware
export const isAuthenticated = (req: IRequest, res: Response, next: NextFunction): void | Response => {
  if (req.session && req.session.adminId) {
    return next();
  }
  req.flash('error', 'Please login to access this page');
  return res.redirect('/admin/login');
};

// Check if already logged in
export const isGuest = (req: IRequest, res: Response, next: NextFunction): void | Response => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  next();
};
