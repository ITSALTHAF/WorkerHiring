import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import JobPosting from '../models/JobPosting.js';
import JobApplication from '../models/JobApplication.js';
import Worker from '../models/Worker.js';
import Profile from '../models/Profile.js';
import mongoose from 'mongoose';

// @desc    Create a new job posting
// @route   POST /api/v1/jobs
// @access  Private
export const createJobPosting = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.userId = req.user.id;

  // Create job posting
  const jobPosting = await JobPosting.create(req.body);

  res.status(201).json({
    success: true,
    data: jobPosting
  });
});

// @desc    Get all job postings
// @route   GET /api/v1/jobs
// @access  Public
export const getJobPostings = asyncHandler(async (req, res, next) => {
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
  let query = JobPosting.find(JSON.parse(queryStr));

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
  const jobPostings = await query;

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
    count: jobPostings.length,
    pagination,
    data: jobPostings
  });
});

// @desc    Get single job posting
// @route   GET /api/v1/jobs/:id
// @access  Public
export const getJobPosting = asyncHandler(async (req, res, next) => {
  const jobPosting = await JobPosting.findById(req.params.id);

  if (!jobPosting) {
    return next(
      new ErrorResponse(`Job posting not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: jobPosting
  });
});

// @desc    Update job posting
// @route   PUT /api/v1/jobs/:id
// @access  Private
export const updateJobPosting = asyncHandler(async (req, res, next) => {
  let jobPosting = await JobPosting.findById(req.params.id);

  if (!jobPosting) {
    return next(
      new ErrorResponse(`Job posting not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is job posting owner
  if (jobPosting.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this job posting`,
        401
      )
    );
  }

  jobPosting = await JobPosting.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: jobPosting
  });
});

// @desc    Delete job posting
// @route   DELETE /api/v1/jobs/:id
// @access  Private
export const deleteJobPosting = asyncHandler(async (req, res, next) => {
  const jobPosting = await JobPosting.findById(req.params.id);

  if (!jobPosting) {
    return next(
      new ErrorResponse(`Job posting not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is job posting owner
  if (jobPosting.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this job posting`,
        401
      )
    );
  }

  await jobPosting.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get current user's job postings
// @route   GET /api/v1/jobs/my-jobs
// @access  Private
export const getMyJobPostings = asyncHandler(async (req, res, next) => {
  const jobPostings = await JobPosting.find({ userId: req.user.id });

  res.status(200).json({
    success: true,
    count: jobPostings.length,
    data: jobPostings
  });
});

// @desc    Apply to a job
// @route   POST /api/v1/jobs/:id/apply
// @access  Private (worker only)
export const applyToJob = asyncHandler(async (req, res, next) => {
  // Check if job exists
  const jobPosting = await JobPosting.findById(req.params.id);

  if (!jobPosting) {
    return next(
      new ErrorResponse(`Job posting not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is a worker
  const profile = await Profile.findOne({ userId: req.user.id });
  
  if (!profile) {
    return next(new ErrorResponse('Profile not found', 404));
  }
  
  const worker = await Worker.findOne({ profileId: profile._id });
  
  if (!worker) {
    return next(new ErrorResponse('Worker profile not found', 404));
  }

  // Check if already applied
  const existingApplication = await JobApplication.findOne({
    jobId: req.params.id,
    workerId: worker._id
  });

  if (existingApplication) {
    return next(
      new ErrorResponse('You have already applied to this job', 400)
    );
  }

  // Create application
  const application = await JobApplication.create({
    jobId: req.params.id,
    workerId: worker._id,
    coverLetter: req.body.coverLetter,
    proposedPrice: req.body.proposedPrice,
    availability: req.body.availability
  });

  res.status(201).json({
    success: true,
    data: application
  });
});

// @desc    Get applications for a job
// @route   GET /api/v1/jobs/:id/applications
// @access  Private
export const getJobApplications = asyncHandler(async (req, res, next) => {
  // Check if job exists
  const jobPosting = await JobPosting.findById(req.params.id);

  if (!jobPosting) {
    return next(
      new ErrorResponse(`Job posting not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is job posting owner
  if (jobPosting.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to view applications for this job posting`,
        401
      )
    );
  }

  // Get applications
  const applications = await JobApplication.find({ jobId: req.params.id })
    .populate({
      path: 'workerId',
      populate: {
        path: 'profileId',
        select: 'firstName lastName avatar'
      }
    });

  res.status(200).json({
    success: true,
    count: applications.length,
    data: applications
  });
});

// @desc    Update job application status
// @route   PUT /api/v1/jobs/applications/:applicationId
// @access  Private
export const updateJobApplication = asyncHandler(async (req, res, next) => {
  // Check if application exists
  const application = await JobApplication.findById(req.params.applicationId);

  if (!application) {
    return next(
      new ErrorResponse(`Application not found with id of ${req.params.applicationId}`, 404)
    );
  }

  // Get job posting
  const jobPosting = await JobPosting.findById(application.jobId);

  if (!jobPosting) {
    return next(
      new ErrorResponse(`Job posting not found for this application`, 404)
    );
  }

  // Check authorization
  if (jobPosting.userId.toString() !== req.user.id && 
      application.workerId.toString() !== req.user.id && 
      req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this application`,
        401
      )
    );
  }

  // Update application
  const updatedApplication = await JobApplication.findByIdAndUpdate(
    req.params.applicationId,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: updatedApplication
  });
});
