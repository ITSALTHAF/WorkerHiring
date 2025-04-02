import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import Profile from '../models/Profile.js';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// @desc    Get current user's profile
// @route   GET /api/v1/profile
// @access  Private
export const getProfile = asyncHandler(async (req, res, next) => {
  const profile = await Profile.findOne({ userId: req.user.id });

  if (!profile) {
    return next(new ErrorResponse('Profile not found', 404));
  }

  res.status(200).json({
    success: true,
    data: profile
  });
});

// @desc    Create user profile
// @route   POST /api/v1/profile
// @access  Private
export const createProfile = asyncHandler(async (req, res, next) => {
  // Check if profile already exists
  const existingProfile = await Profile.findOne({ userId: req.user.id });

  if (existingProfile) {
    return next(new ErrorResponse('Profile already exists for this user', 400));
  }

  // Create profile
  const profile = await Profile.create({
    userId: req.user.id,
    ...req.body
  });

  res.status(201).json({
    success: true,
    data: profile
  });
});

// @desc    Update user profile
// @route   PUT /api/v1/profile
// @access  Private
export const updateProfile = asyncHandler(async (req, res, next) => {
  let profile = await Profile.findOne({ userId: req.user.id });

  if (!profile) {
    return next(new ErrorResponse('Profile not found', 404));
  }

  profile = await Profile.findOneAndUpdate(
    { userId: req.user.id },
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: profile
  });
});

// Configure storage for profile photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/profiles';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      `user-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`
    );
  }
});

// Check file type
const fileFilter = (req, file, cb) => {
  // Allow images only
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new ErrorResponse('Please upload an image file', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1000000 } // 1MB
});

// @desc    Upload profile photo
// @route   POST /api/v1/profile/upload-photo
// @access  Private
export const uploadProfilePhoto = asyncHandler(async (req, res, next) => {
  const uploadMiddleware = upload.single('photo');

  uploadMiddleware(req, res, async function (err) {
    if (err) {
      return next(new ErrorResponse(err.message, 400));
    }

    if (!req.file) {
      return next(new ErrorResponse('Please upload a file', 400));
    }

    const profile = await Profile.findOne({ userId: req.user.id });

    if (!profile) {
      return next(new ErrorResponse('Profile not found', 404));
    }

    // Update profile with new photo
    profile.avatar = `/uploads/profiles/${req.file.filename}`;
    await profile.save();

    res.status(200).json({
      success: true,
      data: profile
    });
  });
});

// @desc    Verify user profile with KYC
// @route   POST /api/v1/profile/verify
// @access  Private
export const verifyProfile = asyncHandler(async (req, res, next) => {
  const { documentType, documentNumber, documentImage } = req.body;

  if (!documentType || !documentNumber || !documentImage) {
    return next(
      new ErrorResponse('Please provide all required verification details', 400)
    );
  }

  const user = await User.findById(req.user.id);
  
  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // In a real implementation, we would:
  // 1. Store the document image
  // 2. Send the verification data to a KYC provider API
  // 3. Process the verification result
  
  // For this example, we'll simulate a successful verification
  user.kycVerified = true;
  user.kycDocuments = user.kycDocuments || [];
  user.kycDocuments.push({
    type: documentType,
    number: documentNumber,
    verifiedAt: Date.now()
  });
  
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      kycVerified: true,
      message: 'Profile verification successful'
    }
  });
});
