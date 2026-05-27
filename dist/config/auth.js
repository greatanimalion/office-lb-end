const auth = {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
    jwtCookieName: process.env.JWT_COOKIE_NAME || 'token',
    jwtCookieMaxAge: parseInt(process.env.JWT_COOKIE_MAX_AGE || '86400000', 10),
};
export default auth;
