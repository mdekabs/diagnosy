import jwt from 'jsonwebtoken';
// Import the core logic from your existing middleware file
import { isTokenBlacklisted } from '../middleware/index.js'; 
import { logger } from '../config/index.js';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifies a JWT token for the WebSocket connection handshake.
 * This is a non-Express version of the authentication check.
 * * @param {string} token The raw JWT string from the WebSocket query parameter.
 * @returns {object} The decoded JWT payload with the User ID mapped to 'sub'.
 * @throws {Error} If the token is invalid, expired, or blacklisted.
 */
export const verifyJWT = async (token) => {
    if (!token) {
        throw new Error('Token missing.');
    }

    // 1. Check Blacklist (Reuse from authMiddleware)
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
        logger.warn('Token verification failed: Token is blacklisted.');
        throw new Error('Token is blacklisted.');
    }

    // 2. Verify JWT Signature and Expiration
    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
        logger.warn(`JWT verification failed: ${jwtError.message}`);
        // Match the general error message from your middleware
        throw new Error(`Invalid token: ${jwtError.message}`); 
    }

    // 3. Check for required User ID in payload (Your token uses 'id')
    if (!decoded.id) {
        logger.warn('JWT verification failed: Missing User ID in payload.');
        throw new Error('Invalid token: Missing user ID.');
    }
    
    // Map 'id' (from your token) to 'sub' (standard JWT subject identifier)
    const finalPayload = { 
        sub: decoded.id, 
        isAdmin: decoded.isAdmin, 
        // Keep other relevant properties if needed
    };

    logger.info(`Token verified for User ID: ${finalPayload.sub}`);
    return finalPayload;
};
