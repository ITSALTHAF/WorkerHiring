import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import Worker from '../models/Worker.js';
import JobPosting from '../models/JobPosting.js';
import ServiceCategory from '../models/ServiceCategory.js';
import Profile from '../models/Profile.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// @desc    Search workers
// @route   GET /api/v1/search/workers
// @access  Public
export const searchWorkers = asyncHandler(async (req, res, next) => {
  const {
    keyword,
    category,
    skills,
    rating,
    price_min,
    price_max,
    location,
    availability,
    sort
  } = req.query;

  // Build query
  let query = {};

  // Keyword search (search in profile name and bio)
  if (keyword) {
    // First get profiles that match the keyword
    const profiles = await Profile.find({
      $or: [
        { firstName: { $regex: keyword, $options: 'i' } },
        { lastName: { $regex: keyword, $options: 'i' } },
        { bio: { $regex: keyword, $options: 'i' } }
      ]
    });

    // Get profile IDs
    const profileIds = profiles.map(profile => profile._id);

    // Add to query
    query.profileId = { $in: profileIds };
  }

  // Category filter
  if (category) {
    query.categories = category;
  }

  // Skills filter
  if (skills) {
    const skillsArray = skills.split(',');
    query.skills = { $in: skillsArray };
  }

  // Rating filter
  if (rating) {
    query.averageRating = { $gte: parseFloat(rating) };
  }

  // Price range filter
  if (price_min || price_max) {
    query.hourlyRate = {};
    if (price_min) query.hourlyRate.$gte = parseFloat(price_min);
    if (price_max) query.hourlyRate.$lte = parseFloat(price_max);
  }

  // Location filter
  if (location) {
    // Get profiles with matching location
    const profiles = await Profile.find({
      location: { $regex: location, $options: 'i' }
    });

    // Get profile IDs
    const profileIds = profiles.map(profile => profile._id);

    // Add to query
    if (query.profileId) {
      // Intersect with existing profile IDs
      query.profileId = { $in: profileIds.filter(id => query.profileId.$in.includes(id)) };
    } else {
      query.profileId = { $in: profileIds };
    }
  }

  // Availability filter
  if (availability === 'now') {
    query['availability.isAvailableNow'] = true;
  }

  // Execute query
  let workers = Worker.find(query).populate({
    path: 'profileId',
    select: 'firstName lastName avatar location bio'
  });

  // Sort
  if (sort) {
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    workers = workers.sort({ [sortField]: sortOrder });
  } else {
    workers = workers.sort({ averageRating: -1 });
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Worker.countDocuments(query);

  workers = workers.skip(startIndex).limit(limit);

  // Execute query
  const results = await workers;

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
    count: results.length,
    pagination,
    data: results
  });
});

// @desc    Search jobs
// @route   GET /api/v1/search/jobs
// @access  Public
export const searchJobs = asyncHandler(async (req, res, next) => {
  const {
    keyword,
    category,
    price_min,
    price_max,
    location,
    urgency,
    status,
    sort
  } = req.query;

  // Build query
  let query = {};

  // Keyword search
  if (keyword) {
    query.$or = [
      { title: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } }
    ];
  }

  // Category filter
  if (category) {
    query.category = category;
  }

  // Price range filter
  if (price_min || price_max) {
    query.budget = {};
    if (price_min) query.budget.$gte = parseFloat(price_min);
    if (price_max) query.budget.$lte = parseFloat(price_max);
  }

  // Location filter
  if (location) {
    query.location = { $regex: location, $options: 'i' };
  }

  // Urgency filter
  if (urgency) {
    query.urgency = urgency;
  }

  // Status filter
  if (status) {
    query.status = status;
  } else {
    // By default, only show open jobs
    query.status = 'open';
  }

  // Execute query
  let jobs = JobPosting.find(query);

  // Sort
  if (sort) {
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    jobs = jobs.sort({ [sortField]: sortOrder });
  } else {
    jobs = jobs.sort({ createdAt: -1 });
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await JobPosting.countDocuments(query);

  jobs = jobs.skip(startIndex).limit(limit);

  // Execute query
  const results = await jobs;

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
    count: results.length,
    pagination,
    data: results
  });
});

// @desc    Get popular categories
// @route   GET /api/v1/search/categories/popular
// @access  Public
export const getPopularCategories = asyncHandler(async (req, res, next) => {
  // Get categories with job count
  const categories = await JobPosting.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  // Get category details
  const categoryIds = categories.map(cat => cat._id);
  const categoryDetails = await ServiceCategory.find({ _id: { $in: categoryIds } });

  // Combine data
  const result = categories.map(cat => {
    const details = categoryDetails.find(c => c._id.toString() === cat._id.toString());
    return {
      _id: cat._id,
      name: details ? details.name : 'Unknown',
      icon: details ? details.icon : null,
      count: cat.count
    };
  });

  res.status(200).json({
    success: true,
    count: result.length,
    data: result
  });
});

// @desc    Get recommended workers for a user
// @route   GET /api/v1/search/workers/recommended
// @access  Private
export const getRecommendedWorkers = asyncHandler(async (req, res, next) => {
  // In a real implementation, this would use AI/ML to recommend workers
  // based on user preferences, past bookings, etc.
  
  // For this example, we'll just return top-rated workers
  const workers = await Worker.find({})
    .sort({ averageRating: -1 })
    .limit(5)
    .populate({
      path: 'profileId',
      select: 'firstName lastName avatar location bio'
    });

  res.status(200).json({
    success: true,
    count: workers.length,
    data: workers
  });
});

// @desc    Get recommended jobs for a worker
// @route   GET /api/v1/search/jobs/recommended
// @access  Private
export const getRecommendedJobs = asyncHandler(async (req, res, next) => {
  // Check if user is a worker
  const user = await User.findById(req.user.id);
  
  if (user.role !== 'worker') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not a worker`,
        400
      )
    );
  }

  // Get worker profile
  const profile = await Profile.findOne({ userId: req.user.id });
  
  if (!profile) {
    return next(new ErrorResponse('Profile not found', 404));
  }
  
  const worker = await Worker.findOne({ profileId: profile._id });
  
  if (!worker) {
    return next(new ErrorResponse('Worker profile not found', 404));
  }

  // In a real implementation, this would use AI/ML to recommend jobs
  // based on worker skills, past jobs, etc.
  
  // For this example, we'll just return recent jobs matching worker categories
  const jobs = await JobPosting.find({
    category: { $in: worker.categories },
    status: 'open'
  })
    .sort({ createdAt: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    count: jobs.length,
    data: jobs
  });
});
