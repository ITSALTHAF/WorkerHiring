import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import User from '../models/User.js';
import axios from 'axios';

// @desc    Authenticate with Google
// @route   POST /api/v1/auth/google
// @access  Public
export const googleAuth = asyncHandler(async (req, res, next) => {
  const { idToken } = req.body;

  try {
    // Verify the Google ID token
    const response = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    );

    const { email, sub: googleId, name, picture } = response.data;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update Google ID if not already set
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
        user.authProviderId = googleId;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // Create new user
      user = await User.create({
        email,
        password: Math.random().toString(36).slice(-8), // Generate random password
        authProvider: 'google',
        authProviderId: googleId,
        isEmailVerified: true
      });

      // Create profile with name from Google
      const nameParts = name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      await user.createProfile({
        firstName,
        lastName,
        avatar: picture
      });
    }

    // Update last login time
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    return next(new ErrorResponse('Invalid Google token', 401));
  }
});

// @desc    Authenticate with Apple
// @route   POST /api/v1/auth/apple
// @access  Public
export const appleAuth = asyncHandler(async (req, res, next) => {
  const { idToken, firstName, lastName } = req.body;

  try {
    // In a real implementation, we would verify the Apple ID token
    // For this example, we'll assume the token is valid and contains the user's email and Apple ID
    
    // Mock verification - in production, use Apple's verification endpoint
    const email = 'user@example.com'; // This would come from the verified token
    const appleId = 'apple123456789'; // This would come from the verified token

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update Apple ID if not already set
      if (user.authProvider !== 'apple') {
        user.authProvider = 'apple';
        user.authProviderId = appleId;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // Create new user
      user = await User.create({
        email,
        password: Math.random().toString(36).slice(-8), // Generate random password
        authProvider: 'apple',
        authProviderId: appleId,
        isEmailVerified: true
      });

      // Create profile with name from Apple (if provided)
      await user.createProfile({
        firstName: firstName || '',
        lastName: lastName || ''
      });
    }

    // Update last login time
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    return next(new ErrorResponse('Invalid Apple token', 401));
  }
});

// @desc    Authenticate with Facebook
// @route   POST /api/v1/auth/facebook
// @access  Public
export const facebookAuth = asyncHandler(async (req, res, next) => {
  const { accessToken } = req.body;

  try {
    // Verify the Facebook access token
    const response = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );

    const { email, id: facebookId, name, picture } = response.data;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Update Facebook ID if not already set
      if (user.authProvider !== 'facebook') {
        user.authProvider = 'facebook';
        user.authProviderId = facebookId;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      // Create new user
      user = await User.create({
        email,
        password: Math.random().toString(36).slice(-8), // Generate random password
        authProvider: 'facebook',
        authProviderId: facebookId,
        isEmailVerified: true
      });

      // Create profile with name from Facebook
      const nameParts = name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      await user.createProfile({
        firstName,
        lastName,
        avatar: picture?.data?.url
      });
    }

    // Update last login time
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    return next(new ErrorResponse('Invalid Facebook token', 401));
  }
});

// @desc    Generate MFA code
// @route   POST /api/v1/auth/mfa/generate
// @access  Private
export const generateMFA = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  // Generate MFA secret and QR code
  const { secret, qrCode } = await user.generateMFASecret();
  
  res.status(200).json({
    success: true,
    data: {
      secret,
      qrCode
    }
  });
});

// @desc    Verify MFA code and enable MFA
// @route   POST /api/v1/auth/mfa/verify
// @access  Private
export const verifyAndEnableMFA = asyncHandler(async (req, res, next) => {
  const { code } = req.body;
  const user = await User.findById(req.user.id);
  
  // Verify the MFA code
  const isValid = user.verifyMFACode(code);
  
  if (!isValid) {
    return next(new ErrorResponse('Invalid MFA code', 400));
  }
  
  // Enable MFA
  user.mfaEnabled = true;
  await user.save();
  
  res.status(200).json({
    success: true,
    data: {
      mfaEnabled: true
    }
  });
});

// @desc    Verify MFA during login
// @route   POST /api/v1/auth/mfa/login
// @access  Public
export const verifyMFALogin = asyncHandler(async (req, res, next) => {
  const { email, code } = req.body;
  
  // Find user
  const user = await User.findOne({ email });
  
  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }
  
  // Verify the MFA code
  const isValid = user.verifyMFACode(code);
  
  if (!isValid) {
    return next(new ErrorResponse('Invalid MFA code', 400));
  }
  
  // Set MFA verified in session
  req.session.mfaVerified = true;
  
  // Update last login time
  user.lastLogin = Date.now();
  await user.save();
  
  sendTokenResponse(user, 200, res);
});

// @desc    Disable MFA
// @route   POST /api/v1/auth/mfa/disable
// @access  Private
export const disableMFA = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  
  // Disable MFA
  user.mfaEnabled = false;
  user.mfaSecret = undefined;
  await user.save();
  
  res.status(200).json({
    success: true,
    data: {
      mfaEnabled: false
    }
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token
    });
};
