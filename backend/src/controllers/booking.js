import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import Booking from '../models/Booking.js';
import JobPosting from '../models/JobPosting.js';
import JobApplication from '../models/JobApplication.js';
import Worker from '../models/Worker.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// @desc    Create a new booking
// @route   POST /api/v1/bookings
// @access  Private
export const createBooking = asyncHandler(async (req, res, next) => {
  const { jobId, workerId, startTime, endTime, details, price } = req.body;

  // Check if job exists
  const jobPosting = await JobPosting.findById(jobId);

  if (!jobPosting) {
    return next(new ErrorResponse(`Job posting not found with id of ${jobId}`, 404));
  }

  // Check if user is job owner
  if (jobPosting.userId.toString() !== req.user.id) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to create a booking for this job`,
        401
      )
    );
  }

  // Check if worker exists
  const worker = await Worker.findById(workerId);

  if (!worker) {
    return next(new ErrorResponse(`Worker not found with id of ${workerId}`, 404));
  }

  // Create booking
  const booking = await Booking.create({
    jobId,
    clientId: req.user.id,
    workerId,
    startTime,
    endTime,
    details,
    price,
    status: 'pending'
  });

  res.status(201).json({
    success: true,
    data: booking
  });
});

// @desc    Get all bookings
// @route   GET /api/v1/bookings
// @access  Private
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
  let query = Booking.find(JSON.parse(queryStr));

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
// @route   GET /api/v1/bookings/:id
// @access  Private
export const getBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
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

  // Make sure user is booking owner or worker
  if (
    booking.clientId.toString() !== req.user.id &&
    booking.workerId.profileId.userId.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to view this booking`,
        401
      )
    );
  }

  res.status(200).json({
    success: true,
    data: booking
  });
});

// @desc    Update booking
// @route   PUT /api/v1/bookings/:id
// @access  Private
export const updateBooking = asyncHandler(async (req, res, next) => {
  let booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(
      new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is booking owner or worker
  if (
    booking.clientId.toString() !== req.user.id &&
    booking.workerId.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this booking`,
        401
      )
    );
  }

  // Don't allow status changes through this endpoint
  if (req.body.status) {
    delete req.body.status;
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

// @desc    Cancel booking
// @route   POST /api/v1/bookings/:id/cancel
// @access  Private
export const cancelBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(
      new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is booking owner or worker
  if (
    booking.clientId.toString() !== req.user.id &&
    booking.workerId.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to cancel this booking`,
        401
      )
    );
  }

  // Check if booking can be cancelled
  if (['completed', 'cancelled'].includes(booking.status)) {
    return next(
      new ErrorResponse(
        `Booking with status ${booking.status} cannot be cancelled`,
        400
      )
    );
  }

  // Update booking status
  booking.status = 'cancelled';
  booking.cancelledBy = req.user.id;
  booking.cancellationReason = req.body.reason || 'No reason provided';
  await booking.save();

  res.status(200).json({
    success: true,
    data: booking
  });
});

// @desc    Get current user's bookings
// @route   GET /api/v1/bookings/my-bookings
// @access  Private
export const getMyBookings = asyncHandler(async (req, res, next) => {
  // Get worker profile if exists
  let workerProfile = null;
  const user = await User.findById(req.user.id);
  
  if (user.role === 'worker') {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (worker) {
      workerProfile = worker._id;
    }
  }

  // Find bookings where user is client or worker
  let query = {};
  
  if (workerProfile) {
    query = {
      $or: [
        { clientId: req.user.id },
        { workerId: workerProfile }
      ]
    };
  } else {
    query = { clientId: req.user.id };
  }

  // Add filters if provided
  if (req.query.status) {
    query.status = req.query.status;
  }

  const bookings = await Booking.find(query)
    .populate('jobId')
    .populate({
      path: 'workerId',
      populate: {
        path: 'profileId',
        select: 'firstName lastName avatar'
      }
    })
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings
  });
});

// @desc    Complete booking
// @route   POST /api/v1/bookings/:id/complete
// @access  Private
export const completeBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(
      new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
    );
  }

  // Only client can mark booking as complete
  if (booking.clientId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to complete this booking`,
        401
      )
    );
  }

  // Check if booking can be completed
  if (booking.status !== 'in-progress') {
    return next(
      new ErrorResponse(
        `Booking with status ${booking.status} cannot be marked as completed`,
        400
      )
    );
  }

  // Update booking status
  booking.status = 'completed';
  booking.completedAt = Date.now();
  await booking.save();

  res.status(200).json({
    success: true,
    data: booking
  });
});

// @desc    Rate booking
// @route   POST /api/v1/bookings/:id/rate
// @access  Private
export const rateBooking = asyncHandler(async (req, res, next) => {
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(
      new ErrorResponse('Please provide a rating between 1 and 5', 400)
    );
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(
      new ErrorResponse(`Booking not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if booking is completed
  if (booking.status !== 'completed') {
    return next(
      new ErrorResponse(
        `Only completed bookings can be rated`,
        400
      )
    );
  }

  // Check if user is part of the booking
  const isClient = booking.clientId.toString() === req.user.id;
  const isWorker = booking.workerId.toString() === req.user.id;

  if (!isClient && !isWorker && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to rate this booking`,
        401
      )
    );
  }

  // Determine who is being rated
  let ratedUserId;
  let raterRole;

  if (isClient) {
    // Client is rating worker
    ratedUserId = booking.workerId;
    raterRole = 'client';
  } else {
    // Worker is rating client
    ratedUserId = booking.clientId;
    raterRole = 'worker';
  }

  // Check if already rated
  const existingReview = await Review.findOne({
    bookingId: booking._id,
    ratedBy: req.user.id
  });

  if (existingReview) {
    return next(
      new ErrorResponse(
        `You have already rated this booking`,
        400
      )
    );
  }

  // Create review
  const review = await Review.create({
    bookingId: booking._id,
    jobId: booking.jobId,
    ratedUserId,
    ratedBy: req.user.id,
    raterRole,
    rating,
    comment: comment || ''
  });

  res.status(201).json({
    success: true,
    data: review
  });
});
