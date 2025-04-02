import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import Worker from '../models/Worker.js';
import Profile from '../models/Profile.js';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// @desc    Get worker profile
// @route   GET /api/v1/worker
// @access  Private
export const getWorkerProfile = asyncHandler(async (req, res, next) => {
  // First check if user has a profile
  const profile = await Profile.findOne({ userId: req.user.id });

  if (!profile) {
    return next(new ErrorResponse('User profile not found', 404));
  }

  // Then check if user has a worker profile
  const worker = await Worker.findOne({ profileId: profile._id });

  if (!worker) {
    return next(new ErrorResponse('Worker profile not found', 404));
  }

  res.status(200).json({
    success: true,
    data: worker
  });
});

// @desc    Create worker profile
// @route   POST /api/v1/worker
// @access  Private
export const createWorkerProfile = asyncHandler(async (req, res, next) => {
  // First check if user has a profile
  const profile = await Profile.findOne({ userId: req.user.id });

  if (!profile) {
    return next(new ErrorResponse('User profile not found. Create a basic profile first', 404));
  }

  // Check if worker profile already exists
  const existingWorker = await Worker.findOne({ profileId: profile._id });

  if (existingWorker) {
    return next(new ErrorResponse('Worker profile already exists for this user', 400));
  }

  // Update user role to worker
  await User.findByIdAndUpdate(req.user.id, { role: 'worker' });

  // Create worker profile
  const worker = await Worker.create({
    profileId: profile._id,
    ...req.body
  });

  res.status(201).json({
    success: true,
    data: worker
  });
});

// @desc    Update worker profile
// @route   PUT /api/v1/worker
// @access  Private (worker only)
export const updateWorkerProfile = asyncHandler(async (req, res, next) => {
  // First check if user has a profile
  const profile = await Profile.findOne({ userId: req.user.id });

  if (!profile) {
    return next(new ErrorResponse('User profile not found', 404));
  }

  // Then check if user has a worker profile
  let worker = await Worker.findOne({ profileId: profile._id });

  if (!worker) {
    return next(new ErrorResponse('Worker profile not found', 404));
  }

  // Update worker profile
  worker = await Worker.findOneAndUpdate(
    { profileId: profile._id },
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: worker
  });
});

// Configure storage for portfolio images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/portfolio';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      `worker-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`
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
  limits: { fileSize: 2000000 } // 2MB
});

// @desc    Upload portfolio images
// @route   POST /api/v1/worker/portfolio
// @access  Private (worker only)
export const uploadPortfolio = asyncHandler(async (req, res, next) => {
  const uploadMiddleware = upload.array('images', 5); // Allow up to 5 images

  uploadMiddleware(req, res, async function (err) {
    if (err) {
      return next(new ErrorResponse(err.message, 400));
    }

    if (!req.files || req.files.length === 0) {
      return next(new ErrorResponse('Please upload at least one file', 400));
    }

    // First check if user has a profile
    const profile = await Profile.findOne({ userId: req.user.id });

    if (!profile) {
      return next(new ErrorResponse('User profile not found', 404));
    }

    // Then check if user has a worker profile
    const worker = await Worker.findOne({ profileId: profile._id });

    if (!worker) {
      return next(new ErrorResponse('Worker profile not found', 404));
    }

    // Get portfolio item details from request
    const { title, description } = req.body;

    if (!title) {
      return next(new ErrorResponse('Please provide a title for the portfolio item', 400));
    }

    // Create image paths array
    const images = req.files.map(file => `/uploads/portfolio/${file.filename}`);

    // Add to portfolio
    worker.portfolio = worker.portfolio || [];
    worker.portfolio.push({
      title,
      description: description || '',
      images
    });

    await worker.save();

    res.status(200).json({
      success: true,
      data: worker.portfolio
    });
  });
});

// @desc    Add certification
// @route   POST /api/v1/worker/certification
// @access  Private (worker only)
export const addCertification = asyncHandler(async (req, res, next) => {
  const { title, issuer, issueDate, expiryDate, verificationUrl } = req.body;

  if (!title || !issuer || !issueDate) {
    return next(new ErrorResponse('Please provide all required certification details', 400));
  }

  // First check if user has a profile
  const profile = await Profile.findOne({ userId: req.user.id });

  if (!profile) {
    return next(new ErrorResponse('User profile not found', 404));
  }

  // Then check if user has a worker profile
  const worker = await Worker.findOne({ profileId: profile._id });

  if (!worker) {
    return next(new ErrorResponse('Worker profile not found', 404));
  }

  // Add certification
  worker.certifications = worker.certifications || [];
  worker.certifications.push({
    title,
    issuer,
    issueDate,
    expiryDate,
    verificationUrl
  });

  await worker.save();

  res.status(200).json({
    success: true,
    data: worker.certifications
  });
});

// @desc    Update availability
// @route   PUT /api/v1/worker/availability
// @access  Private (worker only)
export const updateAvailability = asyncHandler(async (req, res, next) => {
  const { schedule, isAvailableNow } = req.body;

  // First check if user has a profile
  const profile = await Profile.findOne({ userId: req.user.id });

  if (!profile) {
    return next(new ErrorResponse('User profile not found', 404));
  }

  // Then check if user has a worker profile
  const worker = await Worker.findOne({ profileId: profile._id });

  if (!worker) {
    return next(new ErrorResponse('Worker profile not found', 404));
  }

  // Update availability
  worker.availability = {
    schedule: schedule || worker.availability?.schedule || [],
    isAvailableNow: isAvailableNow !== undefined ? isAvailableNow : worker.availability?.isAvailableNow || false
  };

  await worker.save();

  res.status(200).json({
    success: true,
    data: worker.availability
  });
});
