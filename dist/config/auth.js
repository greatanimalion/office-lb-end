const auth = {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
    jwtCookieName: process.env.JWT_COOKIE_NAME || 'token',
    jwtCookieMaxAge: parseInt(process.env.JWT_COOKIE_MAX_AGE || '86400000', 10),
    sessionSecret: process.env.SESSION_SECRET || 'session-secret-key',
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10),
    gitlab: {
        clientId: process.env.GITLAB_CLIENT_ID || 'gitlab_client_id',
        clientSecret: process.env.GITLAB_CLIENT_SECRET || 'gitlab_client_secret',
        callbackUrl: process.env.GITLAB_CALLBACK_URL || 'http://localhost:5000/api/auth/gitlab/callback'
    },
    dingtalk: {
        clientId: process.env.DINGTALK_CLIENT_ID || 'dingtalk_client_id',
        clientSecret: process.env.DINGTALK_CLIENT_SECRET || 'dingtalk_client_secret',
        callbackUrl: process.env.DINGTALK_CALLBACK_URL || 'http://localhost:5000/api/auth/dingtalk/callback'
    },
    wechat: {
        clientId: process.env.WECHAT_CLIENT_ID || 'wechat_client_id',
        clientSecret: process.env.WECHAT_CLIENT_SECRET || 'wechat_client_secret',
        callbackUrl: process.env.WECHAT_CALLBACK_URL || 'http://localhost:5000/api/auth/wechat/callback'
    }
};
export default auth;
