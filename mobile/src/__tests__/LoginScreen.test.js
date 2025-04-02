import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import AuthContext from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';

// Mock navigation
const mockNavigate = jest.fn();
const navigation = {
  navigate: mockNavigate
};

// Mock auth context
const mockLogin = jest.fn();
const mockAuthContext = {
  login: mockLogin,
  isLoading: false,
  error: null
};

describe('LoginScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockLogin.mockClear();
  });

  test('renders correctly', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginScreen navigation={navigation} />
      </AuthContext.Provider>
    );

    expect(screen.getByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByText('Login')).toBeTruthy();
    expect(screen.getByText('Don\'t have an account? Register')).toBeTruthy();
  });

  test('navigates to register screen when register link is pressed', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginScreen navigation={navigation} />
      </AuthContext.Provider>
    );

    fireEvent.press(screen.getByText('Don\'t have an account? Register'));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  test('shows validation errors when form is submitted with empty fields', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginScreen navigation={navigation} />
      </AuthContext.Provider>
    );

    fireEvent.press(screen.getByText('Login'));
    
    expect(screen.getByText('Email is required')).toBeTruthy();
    expect(screen.getByText('Password is required')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('calls login function with correct data when form is valid', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginScreen navigation={navigation} />
      </AuthContext.Provider>
    );

    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(screen.getByPlaceholderText('Password'), 'password123');
    fireEvent.press(screen.getByText('Login'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  test('shows loading indicator when isLoading is true', () => {
    render(
      <AuthContext.Provider value={{ ...mockAuthContext, isLoading: true }}>
        <LoginScreen navigation={navigation} />
      </AuthContext.Provider>
    );

    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
  });

  test('shows error message when there is an error', () => {
    render(
      <AuthContext.Provider value={{ ...mockAuthContext, error: 'Invalid credentials' }}>
        <LoginScreen navigation={navigation} />
      </AuthContext.Provider>
    );

    expect(screen.getByText('Invalid credentials')).toBeTruthy();
  });
});
