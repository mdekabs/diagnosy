import jwt from 'jsonwebtoken';
import { logger } from '../config/index.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const verifyJWT = async (token, isBlacklistedCheck) => {
    if (!token) {
        throw new Error('Token missing.');
    }

    if (isBlacklistedCheck) {
        const blacklisted = await isBlacklistedCheck(token);
        if (blacklisted) {
            logger.warn('Token verification failed: Token is blacklisted.');
            throw new Error('Token is blacklisted.');
        }
    } else {
        logger.warn('Token blacklisting check function was not provided to verifyJWT.');
    }

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
        logger.warn(`JWT verification failed: ${jwtError.message}`);
        throw new Error(`Invalid token: ${jwtError.message}`);
    }

    if (!decoded.id) {
        logger.warn('JWT verification failed: Missing User ID in payload.');
        throw new Error('Invalid token: Missing user ID.');
    }

    const finalPayload = { 
        sub: decoded.id, 
        isAdmin: decoded.isAdmin 
    };

    logger.info(`Token verified for User ID: ${finalPayload.sub}`);
    return finalPayload;
};

