import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import BookingScreen from '../screens/bookings/BookingScreen';
import BookingContext from '../context/BookingContext';
import AuthContext from '../context/AuthContext';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const navigation = {
  navigate: mockNavigate,
  goBack: mockGoBack
};

// Mock route
const route = {
  params: {
    bookingId: '1'
  }
};

// Mock auth context
const mockUser = {
  _id: 'client123',
  email: 'client@example.com',
  role: 'client'
};

const mockAuthContext = {
  user: mockUser,
  isLoading: false,
  error: null
};

// Mock booking context
const mockBooking = {
  _id: '1',
  jobId: {
    _id: 'job123',
    title: 'Fix Leaky Faucet',
    description: 'Need to fix a leaky bathroom faucet',
    category: 'plumbing'
  },
  clientId: 'client123',
  workerId: {
    _id: 'worker123',
    profileId: {
      firstName: 'John',
      lastName: 'Worker',
      avatar: 'https://example.com/avatar.jpg'
    }
  },
  startTime: '2023-05-01T10:00:00.000Z',
  endTime: '2023-05-01T12:00:00.000Z',
  details: 'Please bring your own tools',
  price: 120,
  status: 'pending',
  createdAt: '2023-04-01T10:00:00.000Z'
};

const mockGetBooking = jest.fn().mockResolvedValue(mockBooking);
const mockCancelBooking = jest.fn().mockResolvedValue({ ...mockBooking, status: 'cancelled' });
const mockCompleteBooking = jest.fn().mockResolvedValue({ ...mockBooking, status: 'completed' });
const mockRateBooking = jest.fn();

const mockBookingContext = {
  booking: mockBooking,
  loading: false,
  error: null,
  getBooking: mockGetBooking,
  cancelBooking: mockCancelBooking,
  completeBooking: mockCompleteBooking,
  rateBooking: mockRateBooking
};

describe('BookingScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockGetBooking.mockClear();
    mockCancelBooking.mockClear();
    mockCompleteBooking.mockClear();
    mockRateBooking.mockClear();
  });

  test('renders correctly with booking data', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BookingContext.Provider value={mockBookingContext}>
          <BookingScreen navigation={navigation} route={route} />
        </BookingContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Fix Leaky Faucet')).toBeTruthy();
    expect(screen.getByText('John Worker')).toBeTruthy();
    expect(screen.getByText('$120')).toBeTruthy();
    expect(screen.getByText('Please bring your own tools')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
  });

  test('shows loading indicator when loading', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BookingContext.Provider value={{ ...mockBookingContext, loading: true }}>
          <BookingScreen navigation={navigation} route={route} />
        </BookingContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  test('shows error message when there is an error', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BookingContext.Provider value={{ ...mockBookingContext, error: 'Failed to load booking' }}>
          <BookingScreen navigation={navigation} route={route} />
        </BookingContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Failed to load booking')).toBeTruthy();
  });

  test('calls getBooking on component mount', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BookingContext.Provider value={mockBookingContext}>
          <BookingScreen navigation={navigation} route={route} />
        </BookingContext.Provider>
      </AuthContext.Provider>
    );
    
    expect(mockGetBooking).toHaveBeenCalledWith('1');
  });

  test('shows cancel button for pending bookings when user is client', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BookingContext.Provider value={mockBookingContext}>
          <BookingScreen navigation={navigation} route={route} />
        </BookingContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Cancel Booking')).toBeTruthy();
  });

  test('calls cancelBooking when cancel button is pressed', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BookingContext.Provider value={mockBookingContext}>
          <BookingScreen navigation={navigation} route={route} />
        </BookingContext.Provider>
      </AuthContext.Provider>
    );

    fireEvent.press(screen.getByText('Cancel Booking'));
    
    // Confirm in the modal
    fireEvent.press(screen.getByText('Yes, Cancel'));
    
    await waitFor(() => {
      expect(mockCancelBooking).toHaveBeenCalledWith('1', expect.any(Object));
    });
  });

  test('shows complete button for in-progress bookings when user is client', () => {
    const inProgressBooking = { 
      ...mockBooking, 
      status: 'in-progress' 
    };
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BookingContext.Provider value={{ 
          ...mockBookingContext, 
          booking: inProgressBooking 
        }}>
          <BookingScreen navigation={navigation} route={route} />
        </BookingContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Mark as Completed')).toBeTruthy();
  });

  test('calls completeBooking when complete button is pressed', async () => {
    const inProgressBooking = { 
      ...mockBooking, 
      status: 'in-progress' 
    };
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BookingContext.Provider value={{ 
          ...mockBookingContext, 
          booking: inProgressBooking 
        }}>
          <BookingScreen navigation={navigation} route={route} />
        </BookingContext.Provider>
      </AuthContext.Provider>
    );

    fireEvent.press(screen.getByText('Mark as Completed'));
    
    await waitFor(() => {
      expect(mockCompleteBooking).toHaveBeenCalledWith('1');
    });
  });

  test('shows rate button for completed bookings that are not yet rated', () => {
    const completedBooking = { 
      ...mockBooking, 
      status: 'completed',
      isRated: false
    };
    
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BookingContext.Provider value={{ 
          ...mockBookingContext, 
          booking: completedBooking 
        }}>
          <BookingScreen navigation={navigation} route={route} />
        </BookingContext.Provider>
      </AuthContext.Provider>
    );

    expect(screen.getByText('Rate Worker')).toBeTruthy();
  });

  test('navigates to payment screen for pending bookings', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BookingContext.Provider value={mockBookingContext}>
          <BookingScreen navigation={navigation} route={route} />
        </BookingContext.Provider>
      </AuthContext.Provider>
    );

    fireEvent.press(screen.getByText('Make Payment'));
    
    expect(mockNavigate).toHaveBeenCalledWith('Payment', { bookingId: '1' });
  });

  test('navigates to chat screen when message button is pressed', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <BookingContext.Provider value={mockBookingContext}>
          <BookingScreen navigation={navigation} route={route} />
        </BookingContext.Provider>
      </AuthContext.Provider>
    );

    fireEvent.press(screen.getByText('Message Worker'));
    
    expect(mockNavigate).toHaveBeenCalledWith('Chat', { 
      recipientId: 'worker123',
      jobId: 'job123'
    });
  });
});
