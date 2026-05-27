import rateLimit from 'express-rate-limit';
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: '请求过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: '请求过于频繁，请稍后再试',
            retryAfter: Math.ceil(15 * 60 * 1000 / 1000)
        });
    }
});
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: '登录尝试过于频繁，请15分钟后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
        res.status(429).json({
            error: '登录尝试过于频繁，请15分钟后再试'
        });
    }
});
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        error: '上传次数过多，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: '上传次数过多，请稍后再试'
        });
    }
});
