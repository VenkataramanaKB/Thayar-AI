const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET // Add this to your .env if needed
});

router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    
    console.log('Received auth request with token length:', token?.length);

    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    // Verify the Google token with more lenient time validation
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
      clockTolerance: 5 * 60, // 5 minutes tolerance for clock skew
    });

    const payload = ticket.getPayload();
    console.log('Google payload:', {
      email: payload.email,
      name: payload.name,
      sub: payload.sub,
      exp: payload.exp,
      iat: payload.iat
    });

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    const { email, name, picture, sub: googleId } = payload;

    // Find or create user
    let user = await User.findOne({ where: { email } });

    if (user) {
      // Update existing user
      await user.update({
        name,
        picture,
        googleId
      });
    } else {
      // Create new user
      user = await User.create({
        email,
        name,
        picture,
        googleId
      });
    }

    // Generate our own JWT with longer expiration
    const jwtToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        name: user.name
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '30d', // Longer expiration
        algorithm: 'HS256'
      }
    );

    console.log('Login successful for:', email);

    // Return user data and token
    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    
    // More specific error messages
    if (error.message.includes('Token used too late')) {
      return res.status(401).json({
        error: 'Token expired',
        details: 'Please try logging in again'
      });
    }

    res.status(500).json({ 
      error: 'Authentication failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router; 