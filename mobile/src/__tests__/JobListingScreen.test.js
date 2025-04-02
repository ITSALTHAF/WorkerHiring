import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import JobListingScreen from '../screens/jobs/JobListingScreen';
import JobContext from '../context/JobContext';

// Mock navigation
const mockNavigate = jest.fn();
const navigation = {
  navigate: mockNavigate
};

// Mock job context
const mockJobs = [
  {
    _id: '1',
    title: 'Fix Leaky Faucet',
    category: 'plumbing',
    location: 'New York, NY',
    budget: 100,
    urgency: 'medium',
    status: 'open',
    createdAt: '2023-04-01T10:00:00.000Z'
  },
  {
    _id: '2',
    title: 'Install Light Fixture',
    category: 'electrical',
    location: 'Boston, MA',
    budget: 150,
    urgency: 'high',
    status: 'open',
    createdAt: '2023-04-02T11:30:00.000Z'
  }
];

const mockGetJobs = jest.fn();
const mockJobContext = {
  jobs: mockJobs,
  loading: false,
  error: null,
  getJobs: mockGetJobs,
  filterJobs: mockGetJobs
};

describe('JobListingScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGetJobs.mockClear();
  });

  test('renders correctly with jobs', () => {
    render(
      <JobContext.Provider value={mockJobContext}>
        <JobListingScreen navigation={navigation} />
      </JobContext.Provider>
    );

    expect(screen.getByText('Available Jobs')).toBeTruthy();
    expect(screen.getByText('Fix Leaky Faucet')).toBeTruthy();
    expect(screen.getByText('Install Light Fixture')).toBeTruthy();
    expect(screen.getByText('$100')).toBeTruthy();
    expect(screen.getByText('$150')).toBeTruthy();
  });

  test('shows loading indicator when loading', () => {
    render(
      <JobContext.Provider value={{ ...mockJobContext, loading: true }}>
        <JobListingScreen navigation={navigation} />
      </JobContext.Provider>
    );

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  test('shows error message when there is an error', () => {
    render(
      <JobContext.Provider value={{ ...mockJobContext, error: 'Failed to load jobs' }}>
        <JobListingScreen navigation={navigation} />
      </JobContext.Provider>
    );

    expect(screen.getByText('Failed to load jobs')).toBeTruthy();
  });

  test('shows empty state when no jobs are available', () => {
    render(
      <JobContext.Provider value={{ ...mockJobContext, jobs: [] }}>
        <JobListingScreen navigation={navigation} />
      </JobContext.Provider>
    );

    expect(screen.getByText('No jobs available')).toBeTruthy();
  });

  test('navigates to job details when a job is pressed', () => {
    render(
      <JobContext.Provider value={mockJobContext}>
        <JobListingScreen navigation={navigation} />
      </JobContext.Provider>
    );

    fireEvent.press(screen.getByText('Fix Leaky Faucet'));
    
    expect(mockNavigate).toHaveBeenCalledWith('JobDetails', { jobId: '1' });
  });

  test('calls getJobs on component mount', () => {
    render(
      <JobContext.Provider value={mockJobContext}>
        <JobListingScreen navigation={navigation} />
      </JobContext.Provider>
    );
    
    expect(mockGetJobs).toHaveBeenCalled();
  });

  test('filters jobs when search input changes', async () => {
    render(
      <JobContext.Provider value={mockJobContext}>
        <JobListingScreen navigation={navigation} />
      </JobContext.Provider>
    );

    const searchInput = screen.getByPlaceholderText('Search jobs...');
    fireEvent.changeText(searchInput, 'plumbing');
    
    await waitFor(() => {
      expect(mockGetJobs).toHaveBeenCalledWith(expect.objectContaining({
        keyword: 'plumbing'
      }));
    });
  });

  test('filters jobs when category filter is applied', async () => {
    render(
      <JobContext.Provider value={mockJobContext}>
        <JobListingScreen navigation={navigation} />
      </JobContext.Provider>
    );

    fireEvent.press(screen.getByText('Filter'));
    fireEvent.press(screen.getByText('Plumbing'));
    fireEvent.press(screen.getByText('Apply'));
    
    await waitFor(() => {
      expect(mockGetJobs).toHaveBeenCalledWith(expect.objectContaining({
        category: 'plumbing'
      }));
    });
  });
});
