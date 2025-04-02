import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Worker from '../models/Worker.js';
import mongoose from 'mongoose';

// @desc    Create a new payment
// @route   POST /api/v1/payments
// @access  Private
export const createPayment = asyncHandler(async (req, res, next) => {
  const { bookingId, amount, paymentMethod } = req.body;

  // Check if booking exists
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return next(new ErrorResponse(`Booking not found with id of ${bookingId}`, 404));
  }

  // Check if user is booking owner
  if (booking.clientId.toString() !== req.user.id) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to create a payment for this booking`,
        401
      )
    );
  }

  // Check if payment already exists for this booking
  const existingPayment = await Payment.findOne({ bookingId });

  if (existingPayment) {
    return next(
      new ErrorResponse(
        `Payment already exists for this booking`,
        400
      )
    );
  }

  // Create payment
  const payment = await Payment.create({
    bookingId,
    clientId: req.user.id,
    workerId: booking.workerId,
    amount,
    paymentMethod,
    status: 'pending'
  });

  res.status(201).json({
    success: true,
    data: payment
  });
});

// @desc    Get all payments
// @route   GET /api/v1/payments
// @access  Private (Admin)
export const getPayments = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to view all payments`,
        401
      )
    );
  }

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
  let query = Payment.find(JSON.parse(queryStr));

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
// @route   GET /api/v1/payments/:id
// @access  Private
export const getPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id).populate('bookingId');

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is payment owner or worker
  if (
    payment.clientId.toString() !== req.user.id &&
    payment.workerId.toString() !== req.user.id &&
    req.user.role !== 'admin'
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to view this payment`,
        401
      )
    );
  }

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Update payment status
// @route   PUT /api/v1/payments/:id
// @access  Private (Admin)
export const updatePaymentStatus = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update payment status`,
        401
      )
    );
  }

  const { status } = req.body;

  if (!status) {
    return next(new ErrorResponse('Please provide a status', 400));
  }

  let payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  // Update payment status
  payment = await Payment.findByIdAndUpdate(
    req.params.id,
    { status },
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Get current user's payments
// @route   GET /api/v1/payments/my-payments
// @access  Private
export const getMyPayments = asyncHandler(async (req, res, next) => {
  // Get worker profile if exists
  let workerProfile = null;
  const user = await User.findById(req.user.id);
  
  if (user.role === 'worker') {
    const worker = await Worker.findOne({ userId: req.user.id });
    if (worker) {
      workerProfile = worker._id;
    }
  }

  // Find payments where user is client or worker
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

  const payments = await Payment.find(query)
    .populate('bookingId')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Process payment
// @route   POST /api/v1/payments/:id/process
// @access  Private
export const processPayment = asyncHandler(async (req, res, next) => {
  const { paymentMethodId } = req.body;

  if (!paymentMethodId) {
    return next(new ErrorResponse('Please provide a payment method ID', 400));
  }

  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is payment owner
  if (payment.clientId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to process this payment`,
        401
      )
    );
  }

  // Check if payment can be processed
  if (payment.status !== 'pending') {
    return next(
      new ErrorResponse(
        `Payment with status ${payment.status} cannot be processed`,
        400
      )
    );
  }

  // In a real implementation, we would:
  // 1. Process the payment with a payment gateway (Stripe, PayPal, etc.)
  // 2. Update the payment status based on the response
  
  // For this example, we'll simulate a successful payment
  payment.status = 'completed';
  payment.transactionId = `txn_${Date.now()}`;
  payment.paidAt = Date.now();
  await payment.save();

  // Update booking status
  const booking = await Booking.findById(payment.bookingId);
  if (booking) {
    booking.status = 'in-progress';
    await booking.save();
  }

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Release payment from escrow
// @route   POST /api/v1/payments/:id/release
// @access  Private
export const releaseEscrow = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is payment owner
  if (payment.clientId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to release this payment`,
        401
      )
    );
  }

  // Check if payment can be released
  if (payment.status !== 'completed') {
    return next(
      new ErrorResponse(
        `Payment with status ${payment.status} cannot be released`,
        400
      )
    );
  }

  // In a real implementation, we would:
  // 1. Release the payment from escrow to the worker
  // 2. Update the payment status based on the response
  
  // For this example, we'll simulate a successful release
  payment.status = 'released';
  payment.releasedAt = Date.now();
  await payment.save();

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Request refund
// @route   POST /api/v1/payments/:id/refund-request
// @access  Private
export const requestRefund = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  if (!reason) {
    return next(new ErrorResponse('Please provide a reason for the refund', 400));
  }

  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is payment owner
  if (payment.clientId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to request a refund for this payment`,
        401
      )
    );
  }

  // Check if refund can be requested
  if (!['completed', 'released'].includes(payment.status)) {
    return next(
      new ErrorResponse(
        `Refund cannot be requested for payment with status ${payment.status}`,
        400
      )
    );
  }

  // Update payment status
  payment.status = 'refund-requested';
  payment.refundReason = reason;
  payment.refundRequestedAt = Date.now();
  await payment.save();

  res.status(200).json({
    success: true,
    data: payment
  });
});

// @desc    Process refund
// @route   POST /api/v1/payments/:id/refund-process
// @access  Private (Admin)
export const processRefund = asyncHandler(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to process refunds`,
        401
      )
    );
  }

  const { approved, notes } = req.body;

  if (approved === undefined) {
    return next(new ErrorResponse('Please specify if the refund is approved', 400));
  }

  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if refund can be processed
  if (payment.status !== 'refund-requested') {
    return next(
      new ErrorResponse(
        `Refund cannot be processed for payment with status ${payment.status}`,
        400
      )
    );
  }

  // In a real implementation, we would:
  // 1. Process the refund with the payment gateway
  // 2. Update the payment status based on the response
  
  // For this example, we'll simulate the refund process
  if (approved) {
    payment.status = 'refunded';
    payment.refundedAt = Date.now();
  } else {
    payment.status = 'refund-rejected';
  }
  
  payment.refundNotes = notes || '';
  payment.refundProcessedAt = Date.now();
  await payment.save();

  res.status(200).json({
    success: true,
    data: payment
  });
});
