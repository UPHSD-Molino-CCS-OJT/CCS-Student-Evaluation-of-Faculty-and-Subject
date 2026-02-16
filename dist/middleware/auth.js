"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTeacherAuthenticated = exports.isGuest = exports.isAuthenticated = void 0;
// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.adminId) {
        return next();
    }
    req.flash('error', 'Please login to access this page');
    return res.redirect('/admin/login');
};
exports.isAuthenticated = isAuthenticated;
// Check if already logged in
const isGuest = (req, res, next) => {
    if (req.session && req.session.adminId) {
        return res.redirect('/admin/dashboard');
    }
    next();
};
exports.isGuest = isGuest;
// Teacher Authentication middleware
const isTeacherAuthenticated = (req, res, next) => {
    if (req.session && req.session.teacherId) {
        return next();
    }
    return res.status(401).json({
        success: false,
        message: 'Please login to access this page'
    });
};
exports.isTeacherAuthenticated = isTeacherAuthenticated;
//# sourceMappingURL=auth.js.map