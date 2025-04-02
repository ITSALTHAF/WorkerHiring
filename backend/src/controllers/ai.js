import asyncHandler from '../middleware/async.js';
import ErrorResponse from '../utils/errorResponse.js';
import JobPosting from '../models/JobPosting.js';
import Worker from '../models/Worker.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import ServiceCategory from '../models/ServiceCategory.js';
import mongoose from 'mongoose';

// @desc    Get dynamic price suggestion for a job
// @route   POST /api/v1/ai/dynamic-pricing
// @access  Private
export const getDynamicPrice = asyncHandler(async (req, res, next) => {
  const { 
    category, 
    location, 
    urgency, 
    complexity, 
    duration,
    skills
  } = req.body;

  if (!category || !location || !urgency || !complexity || !duration) {
    return next(
      new ErrorResponse('Please provide all required fields', 400)
    );
  }

  // In a real implementation, this would use a trained ML model
  // to predict the optimal price based on various factors
  
  // For this example, we'll use a simple algorithm

  // 1. Get base price for category
  const categoryData = await ServiceCategory.findById(category);
  let basePrice = categoryData ? categoryData.averagePrice : 50; // Default if category not found

  // 2. Adjust for location (using a simple multiplier)
  const locationMultipliers = {
    'New York': 1.5,
    'San Francisco': 1.6,
    'Los Angeles': 1.4,
    'Chicago': 1.3,
    'Boston': 1.4,
    'Seattle': 1.3,
    'Austin': 1.2,
    'Denver': 1.2,
    'Miami': 1.3,
    'Dallas': 1.2
  };
  
  // Extract city from location
  const city = location.split(',')[0].trim();
  const locationMultiplier = locationMultipliers[city] || 1.0;
  
  // 3. Adjust for urgency
  const urgencyMultipliers = {
    'low': 0.9,
    'medium': 1.0,
    'high': 1.2,
    'emergency': 1.5
  };
  
  const urgencyMultiplier = urgencyMultipliers[urgency] || 1.0;
  
  // 4. Adjust for complexity
  const complexityMultipliers = {
    'simple': 0.8,
    'standard': 1.0,
    'complex': 1.3,
    'expert': 1.6
  };
  
  const complexityMultiplier = complexityMultipliers[complexity] || 1.0;
  
  // 5. Calculate hourly rate
  let hourlyRate = basePrice * locationMultiplier * urgencyMultiplier * complexityMultiplier;
  
  // 6. Calculate total price based on duration
  let totalPrice = hourlyRate * parseFloat(duration);
  
  // 7. Adjust for required skills if provided
  if (skills && skills.length > 0) {
    // Add 5% for each specialized skill
    totalPrice *= (1 + (skills.length * 0.05));
  }
  
  // 8. Get market data for comparison
  const similarJobs = await JobPosting.find({
    category,
    status: 'completed'
  }).sort('-createdAt').limit(10);
  
  const marketAverage = similarJobs.length > 0 
    ? similarJobs.reduce((sum, job) => sum + job.budget, 0) / similarJobs.length 
    : null;
  
  // Round to nearest 5
  hourlyRate = Math.round(hourlyRate / 5) * 5;
  totalPrice = Math.round(totalPrice / 5) * 5;
  
  // Provide price range (±10%)
  const minPrice = Math.round(totalPrice * 0.9);
  const maxPrice = Math.round(totalPrice * 1.1);

  res.status(200).json({
    success: true,
    data: {
      hourlyRate,
      duration: parseFloat(duration),
      suggestedPrice: totalPrice,
      priceRange: {
        min: minPrice,
        max: maxPrice
      },
      marketData: {
        average: marketAverage,
        sampleSize: similarJobs.length
      },
      factors: {
        basePrice,
        locationMultiplier,
        urgencyMultiplier,
        complexityMultiplier,
        skillsAdjustment: skills ? skills.length * 0.05 : 0
      }
    }
  });
});

// @desc    Get matched workers for a job
// @route   GET /api/v1/ai/matched-workers/:jobId
// @access  Private
export const getMatchedWorkers = asyncHandler(async (req, res, next) => {
  // Get job details
  const job = await JobPosting.findById(req.params.jobId);
  
  if (!job) {
    return next(
      new ErrorResponse(`Job not found with id of ${req.params.jobId}`, 404)
    );
  }
  
  // Make sure user is job owner
  if (job.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to get matched workers for this job`,
        401
      )
    );
  }
  
  // In a real implementation, this would use a sophisticated ML model
  // to match workers based on skills, ratings, past performance, etc.
  
  // For this example, we'll use a simple matching algorithm
  
  // 1. Find workers with matching category
  let matchQuery = {
    categories: job.category,
    isActive: true
  };
  
  // 2. If job has specific skills, prioritize workers with those skills
  if (job.requiredSkills && job.requiredSkills.length > 0) {
    matchQuery.skills = { $in: job.requiredSkills };
  }
  
  // Find matching workers
  let workers = await Worker.find(matchQuery)
    .populate({
      path: 'profileId',
      select: 'firstName lastName avatar location bio'
    });
  
  // 3. Calculate match score for each worker
  const workersWithScore = workers.map(worker => {
    // Start with base score
    let score = 70;
    
    // Adjust for rating
    score += (worker.averageRating || 3) * 5;
    
    // Adjust for completed jobs
    score += Math.min(worker.completedJobsCount || 0, 20);
    
    // Adjust for skills match
    if (job.requiredSkills && job.requiredSkills.length > 0) {
      const workerSkills = worker.skills || [];
      const matchingSkills = job.requiredSkills.filter(skill => 
        workerSkills.includes(skill)
      );
      
      score += (matchingSkills.length / job.requiredSkills.length) * 10;
    }
    
    // Cap at 100
    score = Math.min(Math.round(score), 100);
    
    return {
      ...worker.toObject(),
      matchScore: score
    };
  });
  
  // Sort by match score
  workersWithScore.sort((a, b) => b.matchScore - a.matchScore);
  
  res.status(200).json({
    success: true,
    count: workersWithScore.length,
    data: workersWithScore
  });
});

// @desc    Detect potential fraud in a transaction or user
// @route   POST /api/v1/ai/fraud-detection
// @access  Private
export const detectFraud = asyncHandler(async (req, res, next) => {
  const { userId, transactionId, activityType, activityData } = req.body;
  
  if (!userId || !activityType) {
    return next(
      new ErrorResponse('Please provide userId and activityType', 400)
    );
  }
  
  // In a real implementation, this would use a sophisticated fraud detection model
  // analyzing patterns, user behavior, transaction history, etc.
  
  // For this example, we'll use a simple rule-based system
  
  // Get user data
  const user = await User.findById(userId);
  
  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${userId}`, 404)
    );
  }
  
  // Initialize risk score and flags
  let riskScore = 0;
  const riskFlags = [];
  
  // Check account age
  const accountAgeInDays = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (accountAgeInDays < 7) {
    riskScore += 20;
    riskFlags.push('New account (less than 7 days old)');
  }
  
  // Check verification status
  if (!user.isEmailVerified) {
    riskScore += 15;
    riskFlags.push('Email not verified');
  }
  
  if (!user.kycVerified) {
    riskScore += 25;
    riskFlags.push('Identity not verified (KYC)');
  }
  
  // Check activity type specific risks
  switch (activityType) {
    case 'payment':
      // Check for unusual payment amount
      if (activityData && activityData.amount > 1000) {
        riskScore += 15;
        riskFlags.push('Large payment amount');
      }
      
      // Check for multiple payment attempts
      if (activityData && activityData.attemptCount > 3) {
        riskScore += 25;
        riskFlags.push('Multiple payment attempts');
      }
      break;
      
    case 'account_update':
      // Check for frequent updates
      if (activityData && activityData.updateCount > 5) {
        riskScore += 15;
        riskFlags.push('Frequent account updates');
      }
      break;
      
    case 'job_posting':
      // Check for multiple similar job postings
      if (activityData && activityData.similarPostingsCount > 3) {
        riskScore += 20;
        riskFlags.push('Multiple similar job postings');
      }
      break;
      
    case 'login':
      // Check for unusual login location
      if (activityData && activityData.isUnusualLocation) {
        riskScore += 30;
        riskFlags.push('Unusual login location');
      }
      
      // Check for multiple failed attempts
      if (activityData && activityData.failedAttempts > 3) {
        riskScore += 25;
        riskFlags.push('Multiple failed login attempts');
      }
      break;
  }
  
  // Determine risk level
  let riskLevel = 'low';
  if (riskScore >= 30 && riskScore < 60) {
    riskLevel = 'medium';
  } else if (riskScore >= 60) {
    riskLevel = 'high';
  }
  
  // Determine if action should be blocked
  const shouldBlock = riskLevel === 'high';
  
  res.status(200).json({
    success: true,
    data: {
      userId,
      activityType,
      riskScore,
      riskLevel,
      riskFlags,
      recommendation: shouldBlock ? 'block' : 'allow',
      requiresReview: riskLevel === 'medium' || riskLevel === 'high'
    }
  });
});

// @desc    Detect if a review is potentially fake
// @route   POST /api/v1/ai/review-detection
// @access  Private
export const detectFakeReview = asyncHandler(async (req, res, next) => {
  const { reviewId } = req.body;
  
  if (!reviewId) {
    return next(
      new ErrorResponse('Please provide reviewId', 400)
    );
  }
  
  // Get review data
  const review = await Review.findById(reviewId)
    .populate('bookingId')
    .populate('ratedBy')
    .populate('ratedUserId');
  
  if (!review) {
    return next(
      new ErrorResponse(`Review not found with id of ${reviewId}`, 404)
    );
  }
  
  // In a real implementation, this would use an ML model trained on fake reviews
  // analyzing text patterns, user behavior, etc.
  
  // For this example, we'll use a simple rule-based system
  
  // Initialize suspicion score and flags
  let suspicionScore = 0;
  const suspicionFlags = [];
  
  // Check if booking exists and is completed
  if (!review.bookingId) {
    suspicionScore += 50;
    suspicionFlags.push('No associated booking');
  } else if (review.bookingId.status !== 'completed') {
    suspicionScore += 40;
    suspicionFlags.push('Associated booking not completed');
  }
  
  // Check reviewer account age
  if (review.ratedBy) {
    const accountAgeInDays = (Date.now() - new Date(review.ratedBy.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeInDays < 7) {
      suspicionScore += 20;
      suspicionFlags.push('Reviewer has new account (less than 7 days old)');
    }
  }
  
  // Check review text for suspicious patterns
  if (review.comment) {
    // Check for very short reviews
    if (review.comment.length < 10) {
      suspicionScore += 10;
      suspicionFlags.push('Very short review text');
    }
    
    // Check for excessive punctuation or capitalization
    const excessivePunctuation = (review.comment.match(/[!?.]{2,}/g) || []).length > 2;
    const excessiveCapitalization = (review.comment.match(/[A-Z]{3,}/g) || []).length > 1;
    
    if (excessivePunctuation) {
      suspicionScore += 15;
      suspicionFlags.push('Excessive punctuation');
    }
    
    if (excessiveCapitalization) {
      suspicionScore += 15;
      suspicionFlags.push('Excessive capitalization');
    }
    
    // Check for generic text
    const genericPhrases = [
      'great service',
      'highly recommend',
      'best ever',
      'amazing work',
      'excellent service'
    ];
    
    const commentLower = review.comment.toLowerCase();
    const hasGenericPhrases = genericPhrases.some(phrase => commentLower.includes(phrase));
    
    if (hasGenericPhrases && review.comment.length < 30) {
      suspicionScore += 15;
      suspicionFlags.push('Generic short review');
    }
  }
  
  // Check for extreme rating
  if (review.rating === 5 || review.rating === 1) {
    // Extreme ratings are more suspicious
    suspicionScore += 10;
    suspicionFlags.push('Extreme rating (1 or 5 stars)');
  }
  
  // Determine suspicion level
  let suspicionLevel = 'low';
  if (suspicionScore >= 30 && suspicionScore < 60) {
    suspicionLevel = 'medium';
  } else if (suspicionScore >= 60) {
    suspicionLevel = 'high';
  }
  
  // Determine if review should be flagged
  const shouldFlag = suspicionLevel === 'high';
  
  res.status(200).json({
    success: true,
    data: {
      reviewId,
      suspicionScore,
      suspicionLevel,
      suspicionFlags,
      recommendation: shouldFlag ? 'flag' : 'approve',
      requiresReview: suspicionLevel === 'medium' || suspicionLevel === 'high'
    }
  });
});

// @desc    Get chatbot response
// @route   POST /api/v1/ai/chatbot
// @access  Public
export const getChatbotResponse = asyncHandler(async (req, res, next) => {
  const { message, userId, sessionId, context } = req.body;
  
  if (!message) {
    return next(
      new ErrorResponse('Please provide a message', 400)
    );
  }
  
  // In a real implementation, this would use a sophisticated NLP model
  // like GPT to generate contextual responses
  
  // For this example, we'll use a simple intent detection and response system
  
  // Normalize message
  const normalizedMessage = message.toLowerCase().trim();
  
  // Detect intent
  let intent = 'unknown';
  let entities = {};
  
  // Check for greetings
  if (/^(hi|hello|hey|greetings)/.test(normalizedMessage)) {
    intent = 'greeting';
  }
  // Check for service inquiries
  else if (/how (can|do) (i|you) (find|get|hire) (a|an) (\w+)/.test(normalizedMessage)) {
    intent = 'service_inquiry';
    const matches = normalizedMessage.match(/how (can|do) (i|you) (find|get|hire) (a|an) (\w+)/);
    if (matches && matches[5]) {
      entities.serviceType = matches[5];
    }
  }
  // Check for pricing questions
  else if (/how much (does|is|will) (it|a|an) (\w+) cost/.test(normalizedMessage)) {
    intent = 'pricing_inquiry';
    const matches = normalizedMessage.match(/how much (does|is|will) (it|a|an) (\w+) cost/);
    if (matches && matches[3]) {
      entities.serviceType = matches[3];
    }
  }
  // Check for registration questions
  else if (/how (can|do) (i|you) (register|sign up|become) (a|an) (worker|provider)/.test(normalizedMessage)) {
    intent = 'registration_inquiry';
  }
  // Check for booking help
  else if (/how (can|do) (i|you) (book|schedule|hire)/.test(normalizedMessage)) {
    intent = 'booking_help';
  }
  // Check for payment questions
  else if (/how (can|do) (i|you) (pay|make payment|payment)/.test(normalizedMessage)) {
    intent = 'payment_inquiry';
  }
  // Check for thanks
  else if (/thank (you|u)|thanks/.test(normalizedMessage)) {
    intent = 'thanks';
  }
  // Check for goodbye
  else if (/bye|goodbye|see you/.test(normalizedMessage)) {
    intent = 'goodbye';
  }
  
  // Generate response based on intent
  let response = '';
  
  switch (intent) {
    case 'greeting':
      response = "Hello! Welcome to WorkerMatch. How can I help you today?";
      break;
      
    case 'service_inquiry':
      if (entities.serviceType) {
        response = `To find a ${entities.serviceType}, you can use the search feature at the top of the home screen. Enter "${entities.serviceType}" in the search bar, and you'll see a list of available professionals. You can filter by location, price range, and ratings to find the perfect match for your needs.`;
      } else {
        response = "To find a service provider, use the search feature at the top of the home screen. You can search by service type, and filter by location, price range, and ratings to find the perfect match for your needs.";
      }
      break;
      
    case 'pricing_inquiry':
      if (entities.serviceType) {
        response = `The cost of a ${entities.serviceType} varies depending on factors like location, experience, and the specific requirements of your job. You can see price ranges on each worker's profile, or post a job and receive custom quotes from interested professionals.`;
      } else {
        response = "Pricing varies depending on the service type, location, worker experience, and the specific requirements of your job. You can see price ranges on each worker's profile, or post a job and receive custom quotes from interested professionals.";
      }
      break;
      
    case 'registration_inquiry':
      response = "To become a service provider, go to your profile and click on 'Become a Provider'. You'll need to complete your profile with your skills, experience, and pricing information. Once your profile is approved, you can start receiving job requests and applying to open jobs.";
      break;
      
    case 'booking_help':
      response = "To book a service, you can either search for a specific type of worker and book them directly, or post a job and wait for workers to apply. Once you've selected a worker, you can schedule a time, agree on pricing, and confirm the booking through our secure platform.";
      break;
      
    case 'payment_inquiry':
      response = "We offer secure payments through our platform. When you book a service, the payment is held in escrow until the job is completed to your satisfaction. We accept credit/debit cards and various digital payment methods. All transactions are protected by our satisfaction guarantee.";
      break;
      
    case 'thanks':
      response = "You're welcome! Is there anything else I can help you with?";
      break;
      
    case 'goodbye':
      response = "Goodbye! Feel free to chat again if you have any more questions.";
      break;
      
    default:
      response = "I'm not sure I understand. Could you rephrase your question? You can ask me about finding workers, pricing, booking services, payments, or becoming a service provider.";
  }
  
  // In a real implementation, we would store the conversation history
  // and use it to provide more contextual responses
  
  res.status(200).json({
    success: true,
    data: {
      response,
      intent,
      entities,
      sessionId: sessionId || `session_${Date.now()}`,
      timestamp: Date.now()
    }
  });
});
