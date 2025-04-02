import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Worker from '../models/Worker.js';

// @desc    Get user's current role
// @route   GET /api/v1/role
// @access  Private
export const getUserRole = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      role: user.role
    }
  });
});

// @desc    Switch between client and worker roles
// @route   POST /api/v1/role/switch
// @access  Private
export const switchRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;

  if (!role || !['client', 'worker'].includes(role)) {
    return next(new ErrorResponse('Please provide a valid role (client or worker)', 400));
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Check if user has a profile
  const profile = await Profile.findOne({ userId: req.user.id });

  if (!profile) {
    return next(new ErrorResponse('User profile not found. Create a profile first', 404));
  }

  // If switching to worker role, check if worker profile exists
  if (role === 'worker') {
    const workerProfile = await Worker.findOne({ profileId: profile._id });

    if (!workerProfile) {
      return next(new ErrorResponse('Worker profile not found. Create a worker profile first', 404));
    }
  }

  // Update user role
  user.role = role;
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      role: user.role
    }
  });
});
