import { Response, NextFunction } from 'express';
import { IRequest } from '../types';
export declare const isAuthenticated: (req: IRequest, res: Response, next: NextFunction) => void | Response;
export declare const isGuest: (req: IRequest, res: Response, next: NextFunction) => void | Response;
export declare const isTeacherAuthenticated: (req: IRequest, res: Response, next: NextFunction) => void | Response;
//# sourceMappingURL=auth.d.ts.map