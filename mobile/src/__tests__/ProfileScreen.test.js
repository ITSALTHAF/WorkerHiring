import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AuthContext from '../context/AuthContext';
import ProfileContext from '../context/ProfileContext';

// Mock navigation
const mockNavigate = jest.fn();
const navigation = {
  navigate: mockNavigate
};

// Mock auth context
const mockUser = {
  _id: '1',
  email: 'test@example.com',
  role: 'client'
};

const mockAuthContext = {
  user: mockUser,
  isLoading: false,
  error: null
};

// Mock profile context
const mockProfile = {
  _id: '1',
  userId: '1',
  firstName: 'John',
  lastName: 'Doe',
  bio: 'Test bio',
  location: 'New York, NY',
  avatar: 'https://example.com/avatar.jpg',
  phone: '123-456-7890'
};

const mockWorkerProfile = {
  _id: '1',
  profileId: '1',
  hourlyRate: 50,
  categories: ['plumbing', 'electrical'],
  skills: ['faucet repair', 'light fixture installation'],
  availability: {
    isAvailableNow: true,
    schedule: [
      { day: 'monday', startTime: '09:00', endTime: '17:00' },
      { day: 'tuesday', startTime: '09:00', endTime: '17:00' }
    ]
  },
  portfolio: [
    { _id: '1', title: 'Previous Work', imageUrl: 'https://example.com/work1.jpg' }
  ],
  averageRating: 4.5,
  completedJobsCount: 15
};

const mockGetProfile = jest.fn();
const mockUpdateProfile = jest.fn();
const mockGetWorkerProfile = jest.fn().mockResolvedValue(mockWorkerProfile);
const mockUpdateWorkerProfile = jest.fn();

const mockProfileContext = {
  profile: mockProfile,
  workerProfile: mockWorkerProfile,
  loading: false,
  error: null,
  getProfile: mockGetProfile,
  updateProfile: mockUpdateProfile,
  getWorkerProfile: mockGetWorkerProfile,
  updateWorkerProfile: mockUpdateWorkerProfile
};

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGetProfile.mockClear();
    mockUpdateProfile.mockClear();
    mockGetWorkerProfile.mockClear();
    mockUpdateWorkerProfile.mockClear();
  });

  test('renders correctly with profile data', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ProfileContext.Provider value={mockProfileContext}>
          <ProfileScreen navigation={navigation} />
        </ProfileContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Test bio')).toBeTruthy();
    expect(screen.getByText('New York, NY')).toBeTruthy();
    expect(screen.getByText('123-456-7890')).toBeTruthy();
  });

  test('shows loading indicator when loading', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ProfileContext.Provider value={{ ...mockProfileContext, loading: true }}>
          <ProfileScreen navigation={navigation} />
        </ProfileContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  test('shows error message when there is an error', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ProfileContext.Provider value={{ ...mockProfileContext, error: 'Failed to load profile' }}>
          <ProfileScreen navigation={navigation} />
        </ProfileContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Failed to load profile')).toBeTruthy();
  });

  test('navigates to edit profile when edit button is pressed', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ProfileContext.Provider value={mockProfileContext}>
          <ProfileScreen navigation={navigation} />
        </ProfileContext.Provider>
      </AuthContext.Provider>
    );

    fireEvent.press(screen.getByText('Edit Profile'));
    
    expect(mockNavigate).toHaveBeenCalledWith('EditProfile');
  });

  test('displays worker profile information when user is a worker', () => {
    render(
      <AuthContext.Provider value={{ ...mockAuthContext, user: { ...mockUser, role: 'worker' } }}>
        <ProfileContext.Provider value={mockProfileContext}>
          <ProfileScreen navigation={navigation} />
        </ProfileContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('$50/hr')).toBeTruthy();
    expect(screen.getByText('4.5')).toBeTruthy();
    expect(screen.getByText('15 Jobs Completed')).toBeTruthy();
    expect(screen.getByText('plumbing')).toBeTruthy();
    expect(screen.getByText('electrical')).toBeTruthy();
  });

  test('calls getProfile and getWorkerProfile on component mount', () => {
    render(
      <AuthContext.Provider value={{ ...mockAuthContext, user: { ...mockUser, role: 'worker' } }}>
        <ProfileContext.Provider value={mockProfileContext}>
          <ProfileScreen navigation={navigation} />
        </ProfileContext.Provider>
      </AuthContext.Provider>
    );
    
    expect(mockGetProfile).toHaveBeenCalled();
    expect(mockGetWorkerProfile).toHaveBeenCalled();
  });

  test('navigates to worker profile setup when "Become a Worker" is pressed', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <ProfileContext.Provider value={{ ...mockProfileContext, workerProfile: null }}>
          <ProfileScreen navigation={navigation} />
        </ProfileContext.Provider>
      </AuthContext.Provider>
    );

    fireEvent.press(screen.getByText('Become a Worker'));
    
    expect(mockNavigate).toHaveBeenCalledWith('WorkerProfileSetup');
  });

  test('shows portfolio images in worker profile section', () => {
    render(
      <AuthContext.Provider value={{ ...mockAuthContext, user: { ...mockUser, role: 'worker' } }}>
        <ProfileContext.Provider value={mockProfileContext}>
          <ProfileScreen navigation={navigation} />
        </ProfileContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Portfolio')).toBeTruthy();
    expect(screen.getByText('Previous Work')).toBeTruthy();
  });
});
