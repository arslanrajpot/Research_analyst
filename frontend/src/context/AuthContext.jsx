import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false,
        error: null,
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };
    
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();
  const refreshTimeoutRef = useRef(null);
  const authCallbacksRef = useRef([]);

  // Register callback for auth state changes
  const onAuthChange = (callback) => {
    authCallbacksRef.current.push(callback);
    return () => {
      authCallbacksRef.current = authCallbacksRef.current.filter(cb => cb !== callback);
    };
  };

  // Notify all callbacks of auth state change
  const notifyAuthChange = (user, isAuthenticated) => {
    authCallbacksRef.current.forEach(callback => {
      try {
        callback(user, isAuthenticated);
      } catch (error) {
        console.error('Auth callback error:', error);
      }
    });
  };

  // Check if user is already logged in on app start
  useEffect(() => {
    const accessToken = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (accessToken && refreshToken) {
      checkAuthStatus();
    } else if (accessToken) {
      // Only access token exists, try to use it
      checkAuthStatus();
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
      notifyAuthChange(null, false);
    }
  }, []);

  // Set up axios interceptor for automatic token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const response = await axios.post('http://localhost:8000/auth/refresh', {
                refresh_token: refreshToken
              });
              
              const { access_token, refresh_token } = response.data;
              
              // Update tokens
              localStorage.setItem('authToken', access_token);
              if (refresh_token) {
                localStorage.setItem('refreshToken', refresh_token);
              }
              
              // Update axios default headers
              axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
              
              // Retry original request
              originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
              return axios(originalRequest);
            } catch (refreshError) {
              // Refresh failed, logout user
              logout(false); // Don't show success message for failed refresh
              return Promise.reject(refreshError);
            }
          } else {
            logout(false); // Don't show success message for auth failures
            return Promise.reject(error);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const accessToken = localStorage.getItem('authToken');
      if (!accessToken) {
        dispatch({ type: 'SET_LOADING', payload: false });
        notifyAuthChange(null, false);
        return;
      }

      const response = await axios.get('http://localhost:8000/auth/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      dispatch({ type: 'SET_USER', payload: response.data });
      notifyAuthChange(response.data, true);
      
      // Set up automatic token refresh
      setupTokenRefresh();
    } catch (error) {
      console.error('Auth check failed:', error);
      
      // Try to refresh token if access token is invalid
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          await refreshAccessToken(refreshToken);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          logout(false); // Don't show success message for failed refresh
        }
      } else {
        logout(false); // Don't show success message for auth failures
      }
    }
  };

  const refreshAccessToken = async (refreshToken) => {
    try {
      const response = await axios.post('http://localhost:8000/auth/refresh', {
        refresh_token: refreshToken
      });
      
      const { access_token, refresh_token } = response.data;
      
      // Update tokens
      localStorage.setItem('authToken', access_token);
      if (refresh_token) {
        localStorage.setItem('refreshToken', refresh_token);
      }
      
      // Get complete user profile
      const userResponse = await axios.get('http://localhost:8000/auth/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      
      dispatch({ type: 'SET_USER', payload: userResponse.data });
      notifyAuthChange(userResponse.data, true);
      setupTokenRefresh();
      
      return access_token;
    } catch (error) {
      throw error;
    }
  };

  const setupTokenRefresh = () => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Set up refresh 5 minutes before token expires (25 minutes from now)
    const refreshTime = 25 * 60 * 1000; // 25 minutes in milliseconds
    refreshTimeoutRef.current = setTimeout(async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          await refreshAccessToken(refreshToken);
        } catch (error) {
          console.error('Automatic token refresh failed:', error);
          logout(false); // Don't show success message for failed automatic refresh
        }
      }
    }, refreshTime);
  };

  const login = async (email, password, rememberMe = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await axios.post('http://localhost:8000/auth/login', {
        email,
        password,
        remember_me: rememberMe,
      });

      const { access_token, refresh_token } = response.data;
      
      // Store tokens based on remember me preference
      if (rememberMe) {
        localStorage.setItem('authToken', access_token);
        if (refresh_token) {
          localStorage.setItem('refreshToken', refresh_token);
        }
      } else {
        // Use sessionStorage for regular sessions
        sessionStorage.setItem('authToken', access_token);
        if (refresh_token) {
          sessionStorage.setItem('refreshToken', refresh_token);
        }
      }

      // Get complete user profile
      const userResponse = await axios.get('http://localhost:8000/auth/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      dispatch({ type: 'SET_USER', payload: userResponse.data });
      notifyAuthChange(userResponse.data, true);
      
      // Set up automatic token refresh if remember me is enabled
      if (rememberMe) {
        setupTokenRefresh();
      }
      
      toast.success('Welcome back!');
      navigate('/');
      return userResponse.data;
    } catch (error) {
      let message = 'Login failed';
      
      if (error.response?.status === 401) {
        message = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.response?.status === 422) {
        message = 'Please check your input and try again.';
      } else if (error.response?.status === 429) {
        message = 'Too many login attempts. Please wait a moment and try again.';
      } else if (error.response?.status === 500) {
        message = 'Server error. Please try again later.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        message = 'Network error. Please check your internet connection and try again.';
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.message) {
        message = error.message;
      }
      
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      throw error;
    }
  };

  const signup = async (userData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      await axios.post('http://localhost:8000/auth/register', userData);
      
      // After successful registration, login the user
      const loginResponse = await axios.post('http://localhost:8000/auth/login', {
        email: userData.email,
        password: userData.password,
        remember_me: true, // Default to remember me for new users
      });

      const { access_token, refresh_token } = loginResponse.data;
      
      // Store tokens
      localStorage.setItem('authToken', access_token);
      if (refresh_token) {
        localStorage.setItem('refreshToken', refresh_token);
      }

      // Get complete user profile
      const userResponse = await axios.get('http://localhost:8000/auth/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      dispatch({ type: 'SET_USER', payload: userResponse.data });
      notifyAuthChange(userResponse.data, true);
      setupTokenRefresh();
      
      toast.success('Account created successfully!');
      navigate('/');
      return userResponse.data;
    } catch (error) {
      let message = 'Signup failed';
      
      if (error.response?.status === 409) {
        message = 'An account with this email already exists. Please try logging in instead.';
      } else if (error.response?.status === 422) {
        // Handle validation errors
        const validationErrors = error.response?.data?.detail;
        if (Array.isArray(validationErrors)) {
          const fieldErrors = validationErrors.map(err => err.msg).join(', ');
          message = `Please fix the following errors: ${fieldErrors}`;
        } else {
          message = 'Please check your input and try again.';
        }
      } else if (error.response?.status === 429) {
        message = 'Too many signup attempts. Please wait a moment and try again.';
      } else if (error.response?.status === 500) {
        message = 'Server error. Please try again later.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        message = 'Network error. Please check your internet connection and try again.';
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.message) {
        message = error.message;
      }
      
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
      throw error;
    }
  };

  const demoLogin = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await axios.post('http://localhost:8000/auth/demo-login');
      
      const { access_token, refresh_token } = response.data;
      
      // Store tokens
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      
      // Set axios default headers
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Get user profile
      const userResponse = await axios.get('http://localhost:8000/auth/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      
      dispatch({ type: 'SET_USER', payload: userResponse.data });
      notifyAuthChange(userResponse.data, true);
      
      // Set up automatic token refresh
      setupTokenRefresh();
      
      toast.success('Demo login successful!');
      navigate('/');
      
    } catch (error) {
      let message = 'Demo login failed';
      
      if (error.response?.status === 500) {
        message = 'Server error. Please try again later.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        message = 'Network error. Please check your internet connection and try again.';
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const googleLogin = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    // Flag to prevent multiple processing of the same code
    let isProcessing = false;
    let processedCode = null;
    
    try {
      // Get Google OAuth URL
      const response = await axios.get('http://localhost:8000/auth/google/url');
      const { auth_url } = response.data;
      
      // Open Google OAuth popup
      const popup = window.open(
        auth_url,
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      // Listen for the callback
      const handleMessage = async (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
          const { code } = event.data;
          
          // Prevent processing the same code multiple times
          if (isProcessing || processedCode === code) {
            return;
          }
          
          isProcessing = true;
          processedCode = code;
          
          try {
            // Exchange code for token
            const tokenResponse = await axios.post('http://localhost:8000/auth/google/callback', {
              code
            });
            
            const { access_token, refresh_token } = tokenResponse.data;
            
            // Store tokens (Google login typically uses remember me)
            localStorage.setItem('authToken', access_token);
            if (refresh_token) {
              localStorage.setItem('refreshToken', refresh_token);
            }
            
            // Get complete user profile
            const userResponse = await axios.get('http://localhost:8000/auth/me', {
              headers: {
                Authorization: `Bearer ${access_token}`,
              },
            });
            
            dispatch({ type: 'SET_USER', payload: userResponse.data });
            notifyAuthChange(userResponse.data, true);
            setupTokenRefresh();
            
            toast.success('Successfully signed in with Google!');
            navigate('/');
            
            // Cleanup
            cleanup();
          } catch (error) {
            let message = 'Google authentication failed';
            
            if (error.response?.status === 400) {
              message = 'Invalid authentication code. Please try again.';
            } else if (error.response?.status === 401) {
              message = 'Google authentication failed. Please try again.';
            } else if (error.response?.status === 422) {
              message = 'Invalid authentication request. Please try again.';
            } else if (error.response?.status === 500) {
              message = 'Server error during Google authentication. Please try again later.';
            } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
              message = 'Network error. Please check your internet connection and try again.';
            } else if (error.response?.data?.detail) {
              message = error.response.data.detail;
            } else if (error.message) {
              message = error.message;
            }
            
            toast.error(message);
            // Reset processing flag on error
            isProcessing = false;
            processedCode = null;
            // Cleanup
            cleanup();
          }
        } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
          toast.error('Google authentication was cancelled');
          cleanup();
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Handle popup closed
      const checkClosed = setInterval(() => {
        try {
          if (popup && popup.closed) {
            clearInterval(checkClosed);
            cleanup();
          }
        } catch (error) {
          // Handle Cross-Origin-Opener-Policy errors
          clearInterval(checkClosed);
          cleanup();
        }
      }, 1000);
      
      // Timeout after 5 minutes to prevent hanging
      const timeout = setTimeout(() => {
        clearInterval(checkClosed);
        cleanup();
        toast.error('Google authentication timed out. Please try again.');
      }, 5 * 60 * 1000);
      
      // Cleanup function
      const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkClosed);
        clearTimeout(timeout);
        if (popup && !popup.closed) {
          try {
            popup.close();
          } catch (error) {
            // Popup access blocked by CORS policy
          }
        }
        dispatch({ type: 'SET_LOADING', payload: false });
      };
      
    } catch (error) {
      let message = 'Failed to initialize Google authentication';
      
      if (error.response?.status === 503) {
        message = 'Google authentication is not available. Please try again later or use email/password login.';
      } else if (error.response?.status === 500) {
        message = 'Server error. Please try again later.';
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        message = 'Network error. Please check your internet connection and try again.';
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = (showSuccessMessage = true) => {
    // Clear all tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('refreshToken');
    
    // Clear refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    dispatch({ type: 'LOGOUT' });
    notifyAuthChange(null, false);
    
    if (showSuccessMessage) {
      toast.success('Logged out successfully');
    }
    
    navigate('/login');
  };

  const updateProfile = async (profileData) => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await axios.put('http://localhost:8000/auth/me', profileData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      dispatch({ type: 'UPDATE_USER', payload: response.data });
      toast.success('Profile updated successfully!');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || error.message || 'Profile update failed';
      toast.error(message);
      throw error;
    }
  };

  const value = {
    ...state,
    login,
    signup,
    demoLogin,
    googleLogin,
    logout,
    updateProfile,
    checkAuthStatus,
    onAuthChange,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
