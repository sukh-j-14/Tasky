const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Basic authentication middleware
module.exports.authenticateUser = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId || decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'Account is deactivated' });
        }

        // Update last active (with error handling)
        try {
            user.lastActive = new Date();
            await user.save();
        } catch (saveError) {
            // Continue anyway - this is not critical
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Optional authentication middleware (doesn't fail if no token)
module.exports.optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId || decoded.id).select('-password');
            
            if (user && user.isActive) {
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

// Check if user is freelancer
module.exports.requireFreelancer = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!req.user.isFreelancer) {
        return res.status(403).json({ message: 'Freelancer account required' });
    }
    
    next();
};

// Check if user is client (can post tasks)
module.exports.requireClient = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    
    // All authenticated users can be clients
    next();
};

// Check if user is verified
module.exports.requireVerified = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!req.user.isVerified) {
        return res.status(403).json({ message: 'Verified account required' });
    }
    
    next();
};

// Check if user owns the resource
module.exports.requireOwnership = (resourceModel, resourceIdParam = 'id', userIdField = 'clientId') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const resourceId = req.params[resourceIdParam];
            const resource = await resourceModel.findById(resourceId);
            
            if (!resource) {
                return res.status(404).json({ message: 'Resource not found' });
            }

            const resourceOwnerId = resource[userIdField].toString();
            const currentUserId = req.user._id.toString();

            if (resourceOwnerId !== currentUserId) {
                return res.status(403).json({ message: 'Access denied' });
            }

            req.resource = resource;
            next();
        } catch (error) {
            console.error('Ownership check error:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    };
};

// Check if user is participant in conversation
module.exports.requireConversationAccess = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const { conversationId } = req.params;
        const Conversation = require('../models/Message').Conversation;
        
        const conversation = await Conversation.findById(conversationId);
        
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        if (!conversation.participants.includes(req.user._id)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        req.conversation = conversation;
        next();
    } catch (error) {
        console.error('Conversation access check error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Rate limiting middleware
const rateLimitMap = new Map();

module.exports.rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        if (!rateLimitMap.has(key)) {
            rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        const userLimit = rateLimitMap.get(key);
        
        if (now > userLimit.resetTime) {
            rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        if (userLimit.count >= maxRequests) {
            return res.status(429).json({ 
                message: 'Too many requests',
                retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
            });
        }
        
        userLimit.count++;
        next();
    };
};

// Admin middleware (you can implement admin role checking)
module.exports.requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }
    
    // For now, we'll check if user has admin role in metadata
    // You can implement proper admin role system
    if (!req.user.metadata?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
};