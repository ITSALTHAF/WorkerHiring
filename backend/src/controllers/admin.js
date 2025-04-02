import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Worker from '../models/Worker.js';
import JobPosting from '../models/JobPosting.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import mongoose from 'mongoose';

// @desc    Get dashboard statistics
// @route   GET /api/v1/admin/dashboard
// @access  Private (Admin)
export const getDashboardStats = asyncHandler(async (req, res, next) => {
  // Get user stats
  const totalUsers = await User.countDocuments();
  const newUsersToday = await User.countDocuments({
    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
  });
  const activeUsers = await User.countDocuments({ isActive: true });
  
  // Get worker stats
  const totalWorkers = await Worker.countDocuments();
  const newWorkersToday = await Worker.countDocuments({
    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
  });
  
  // Get job stats
  const totalJobs = await JobPosting.countDocuments();
  const openJobs = await JobPosting.countDocuments({ status: 'open' });
  const completedJobs = await JobPosting.countDocuments({ status: 'completed' });
  
  // Get booking stats
  const totalBookings = await Booking.countDocuments();
  const pendingBookings = await Booking.countDocuments({ status: 'pending' });
  const inProgressBookings = await Booking.countDocuments({ status: 'in-progress' });
  const completedBookings = await Booking.countDocuments({ status: 'completed' });
  
  // Get payment stats
  const totalPayments = await Payment.countDocuments();
  const totalRevenue = await Payment.aggregate([
    { $match: { status: { $in: ['completed', 'released'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;
  
  // Get recent activity
  const recentJobs = await JobPosting.find()
    .sort('-createdAt')
    .limit(5)
    .populate('userId', 'email');
    
  const recentBookings = await Booking.find()
    .sort('-createdAt')
    .limit(5)
    .populate('clientId', 'email')
    .populate('workerId');
    
  const recentPayments = await Payment.find()
    .sort('-createdAt')
    .limit(5)
    .populate('clientId', 'email')
    .populate('workerId');
  
  res.status(200).json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        active: activeUsers
      },
      workers: {
        total: totalWorkers,
        newToday: newWorkersToday
      },
      jobs: {
        total: totalJobs,
        open: openJobs,
        completed: completedJobs
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        inProgress: inProgressBookings,
        completed: completedBookings
      },
      payments: {
        total: totalPayments,
        revenue
      },
      recentActivity: {
        jobs: recentJobs,
        bookings: recentBookings,
        payments: recentPayments
      }
    }
  });
});

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
export const getUsers = asyncHandler(async (req, res, next) => {
  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  let query = User.find(JSON.parse(queryStr));

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await User.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const users = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: users.length,
    pagination,
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/v1/admin/users/:id
// @access  Private (Admin)
export const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Get user profile
  const profile = await Profile.findOne({ userId: user._id });
  
  // Get worker profile if exists
  let worker = null;
  if (profile) {
    worker = await Worker.findOne({ profileId: profile._id });
  }
  
  // Get user stats
  const jobsPosted = await JobPosting.countDocuments({ userId: user._id });
  const bookingsAsClient = await Booking.countDocuments({ clientId: user._id });
  
  let bookingsAsWorker = 0;
  if (worker) {
    bookingsAsWorker = await Booking.countDocuments({ workerId: worker._id });
  }
  
  const payments = await Payment.find({ 
    $or: [
      { clientId: user._id },
      { workerId: worker ? worker._id : null }
    ]
  });

  res.status(200).json({
    success: true,
    data: {
      user,
      profile,
      worker,
      stats: {
        jobsPosted,
        bookingsAsClient,
        bookingsAsWorker,
        payments: payments.length
      }
    }
  });
});

// @desc    Update user
// @route   PUT /api/v1/admin/users/:id
// @access  Private (Admin)
export const updateUser = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Don't allow password updates through this endpoint
  if (req.body.password) {
    delete req.body.password;
  }

  user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/admin/users/:id
// @access  Private (Admin)
export const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // In a real implementation, we would:
  // 1. Check if user has any active bookings or payments
  // 2. Decide whether to hard delete or soft delete
  
  // For this example, we'll just delete the user
  await user.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Suspend user
// @route   PUT /api/v1/admin/users/:id/suspend
// @access  Private (Admin)
export const suspendUser = asyncHandler(async (req, res, next) => {
  const { reason, duration } = req.body;
  
  if (!reason) {
    return next(new ErrorResponse('Please provide a reason for suspension', 400));
  }
  
  let user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Calculate suspension end date
  let suspensionEnd = null;
  if (duration) {
    suspensionEnd = new Date();
    suspensionEnd.setDate(suspensionEnd.getDate() + parseInt(duration));
  }

  user = await User.findByIdAndUpdate(
    req.params.id,
    {
      isActive: false,
      isSuspended: true,
      suspensionReason: reason,
      suspensionEnd
    },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Get all jobs
// @route   GET /api/v1/admin/jobs
// @access  Private (Admin)
export const getJobs = asyncHandler(async (req, res, next) => {
  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  let query = JobPosting.find(JSON.parse(queryStr)).populate('userId', 'email');

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await JobPosting.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const jobs = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: jobs.length,
    pagination,
    data: jobs
  });
});

// @desc    Get single job
// @route   GET /api/v1/admin/jobs/:id
// @access  Private (Admin)
export const getJob = asyncHandler(async (req, res, next) => {
  const job = await JobPosting.findById(req.params.id).populate('userId', 'email');

  if (!job) {
    return next(
      new ErrorResponse(`Job not found with id of ${req.params.id}`, 404)
    );
  }

  // Get job applications
  const applications = await JobApplication.find({ jobId: job._id })
    .populate({
      path: 'workerId',
      populate: {
        path: 'profileId',
        select: 'firstName lastName avatar'
      }
    });
    
  // Get bookings for this job
  const bookings = await Booking.find({ jobId: job._id })
    .populate('clientId', 'email')
    .populate({
      path: 'workerId',
      populate: {
        path: 'profileId',
        select: 'firstName lastName avatar'
      }
    });

  res.status(200).json({
    success: true,
    data: {
      job,
      applications,
      bookings
    }
  });
});

// @desc    Update job
// @route   PUT /api/v1/admin/jobs/:id
// @access  Private (Admin)
export const updateJob = asyncHandler(async (req, res, next) => {
  let job = await JobPosting.findById(req.params.id);

  if (!job) {
    return next(
      new ErrorResponse(`Job not found with id of ${req.params.id}`, 404)
    );
  }

  job = await JobPosting.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: job
  });
});

// @desc    Delete job
// @route   DELETE /api/v1/admin/jobs/:id
// @access  Private (Admin)
export const deleteJob = asyncHandler(async (req, res, next) => {
  const job = await JobPosting.findById(req.params.id);

  if (!job) {
    return next(
      new ErrorResponse(`Job not found with id of ${req.params.id}`, 404)
    );
  }

  // In a real implementation, we would:
  // 1. Check if job has any active bookings
  // 2. Decide whether to hard delete or soft delete
  
  // For this example, we'll just delete the job
  await job.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get all bookings
// @route   GET /api/v1/admin/bookings
// @access  Private (Admin)
export const getBookings = asyncHandler(async (req, res, next) => {
  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  let query = Booking.find(JSON.parse(queryStr))
    .populate('clientId', 'email')
    .populate('jobId')
    .populate({
      path: 'workerId',
      populate: {
        path: 'profileId',
        select: 'firstName lastName avatar'
      }
    });

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Booking.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const bookings = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: bookings.length,
    pagination,
    data: bookings
  });
});

// @desc    Get single booking
// @route   GET /api/v1/admin/bookings/:id
// @access  Private (Admin)
export const getBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('clientId', 'email')
    .populate('jobId')
    .populate({
      path: 'workerId',
      populate: {
        path: 'profileId',
        select: 'firstName lastName avatar'
      }
    });

  if (!booking) {
    return next(
      new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
    );
  }

  // Get payments for this booking
  const payments = await Payment.find({ bookingId: booking._id });
  
  // Get reviews for this booking
  const reviews = await Review.find({ bookingId: booking._id })
    .populate('ratedBy', 'email')
    .populate('ratedUserId', 'email');

  res.status(200).json({
    success: true,
    data: {
      booking,
      payments,
      reviews
    }
  });
});

// @desc    Update booking
// @route   PUT /api/v1/admin/bookings/:id
// @access  Private (Admin)
export const updateBooking = asyncHandler(async (req, res, next) => {
  let booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(
      new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
    );
  }

  booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: booking
  });
});

// @desc    Get all payments
// @route   GET /api/v1/admin/payments
// @access  Private (Admin)
export const getPayments = asyncHandler(async (req, res, next) => {
  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  let query = Payment.find(JSON.parse(queryStr))
    .populate('clientId', 'email')
    .populate('workerId')
    .populate('bookingId');

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Payment.countDocuments(JSON.parse(queryStr));

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const payments = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: payments.length,
    pagination,
    data: payments
  });
});

// @desc    Get single payment
// @route   GET /api/v1/admin/payments/:id
// @access  Private (Admin)
export const getPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate('clientId', 'email')
    .populate({
      path: 'workerId',
      populate: {
        path: 'profileId',
        select: 'firstName lastName avatar'
      }
    })
    .populate('bookingId');

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Update payment
// @route   PUT /api/v1/admin/payments/:id
// @access  Private (Admin)
export const updatePayment = asyncHandler(async (req, res, next) => {
  let payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Get all reports
// @route   GET /api/v1/admin/reports
// @access  Private (Admin)
export const getReports = asyncHandler(async (req, res, next) => {
  // In a real implementation, we would have a Report model
  // For this example, we'll return a mock response
  
  const mockReports = [
    {
      id: '1',
      type: 'user',
      reportedId: '60d0fe4f5311236168a109ca',
      reportedBy: '60d0fe4f5311236168a109cb',
      reason: 'Inappropriate behavior',
      description: 'User was rude and unprofessional',
      status: 'pending',
      createdAt: '2023-04-01T10:00:00.000Z'
    },
    {
      id: '2',
      type: 'review',
      reportedId: '60d0fe4f5311236168a109cc',
      reportedBy: '60d0fe4f5311236168a109cd',
      reason: 'Fake review',
      description: 'This review seems to be fake as the user never hired me',
      status: 'resolved',
      createdAt: '2023-04-02T11:30:00.000Z'
    }
  ];

  res.status(200).json({
    success: true,
    count: mockReports.length,
    data: mockReports
  });
});

// @desc    Get single report
// @route   GET /api/v1/admin/reports/:id
// @access  Private (Admin)
export const getReport = asyncHandler(async (req, res, next) => {
  // In a real implementation, we would fetch from a Report model
  // For this example, we'll return a mock response
  
  const mockReport = {
    id: req.params.id,
    type: 'user',
    reportedId: '60d0fe4f5311236168a109ca',
    reportedBy: '60d0fe4f5311236168a109cb',
    reason: 'Inappropriate behavior',
    description: 'User was rude and unprofessional',
    status: 'pending',
    createdAt: '2023-04-01T10:00:00.000Z',
    updatedAt: null,
    resolvedBy: null,
    resolution: null
  };

  res.status(200).json({
    success: true,
    data: mockReport
  });
});

// @desc    Update report
// @route   PUT /api/v1/admin/reports/:id
// @access  Private (Admin)
export const updateReport = asyncHandler(async (req, res, next) => {
  // In a real implementation, we would update a Report model
  // For this example, we'll return a mock response
  
  const { status, resolution } = req.body;
  
  const mockReport = {
    id: req.params.id,
    type: 'user',
    reportedId: '60d0fe4f5311236168a109ca',
    reportedBy: '60d0fe4f5311236168a109cb',
    reason: 'Inappropriate behavior',
    description: 'User was rude and unprofessional',
    status: status || 'resolved',
    createdAt: '2023-04-01T10:00:00.000Z',
    updatedAt: new Date().toISOString(),
    resolvedBy: req.user.id,
    resolution: resolution || 'User was warned about their behavior'
  };

  res.status(200).json({
    success: true,
    data: mockReport
  });
});

// @desc    Get system logs
// @route   GET /api/v1/admin/logs
// @access  Private (Admin)
export const getSystemLogs = asyncHandler(async (req, res, next) => {
  // In a real implementation, we would have a SystemLog model
  // For this example, we'll return a mock response
  
  const mockLogs = [
    {
      id: '1',
      level: 'info',
      message: 'User login',
      userId: '60d0fe4f5311236168a109ca',
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      timestamp: '2023-04-01T10:00:00.000Z'
    },
    {
      id: '2',
      level: 'error',
      message: 'Payment failed',
      userId: '60d0fe4f5311236168a109cb',
      ip: '192.168.1.2',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      timestamp: '2023-04-02T11:30:00.000Z'
    }
  ];

  res.status(200).json({
    success: true,
    count: mockLogs.length,
    data: mockLogs
  });
});
