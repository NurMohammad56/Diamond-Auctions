// Middleware for admin
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ status: false, message: 'Access denied. Admins only' });
};

const isUser = (req, res, next) => {
    if (req.user && req.user.role === 'user') {
        return next();
    }
    return res.status(403).json({ status: false, message: 'Access denied. User only.' });
};

const isSeller = (req, res, next) => {
    if (req.user && req.user.role === 'seller') {
        return next();
    }
    return res.status(403).json({ status: false, message: 'Access denied. seller only.' });
};
export { isAdmin, isSeller, isUser };