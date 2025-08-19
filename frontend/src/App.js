import React, { useEffect, useState } from 'react'; // Add useEffect for debugging
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Layout Components
import Layout from './components/layout/Layout';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';

// Page Components
import Dashboard from './pages/Dashboard';
import ResearchGenerator from './pages/ResearchGenerator';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Search from './pages/Search';
import GoogleCallback from './pages/GoogleCallback';
import Debug from './pages/Debug';

// Context
import { ResearchProvider } from './context/ResearchContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DarkModeProvider } from './context/DarkModeContext';

// Real-time Status Component
import ResearchProgress from './components/ResearchProgress';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component (unused but kept for future use)
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    console.log('🔍 ProtectedRoute: Redirecting to /login (not authenticated)');
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route Component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    console.log('🔍 PublicRoute: Redirecting to / (authenticated)');
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppContent() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation(); // Add useLocation for debugging
  const [showResearchProgress, setShowResearchProgress] = useState(false);

  // Debug route changes
  useEffect(() => {
    console.log('🔍 AppContent: Route changed to:', location.pathname + location.search);
    console.log('🔍 AppContent: isAuthenticated:', isAuthenticated, 'authLoading:', authLoading);
  }, [location, isAuthenticated, authLoading]);

  // Listen for research progress events
  useEffect(() => {
    const handleShowResearchProgress = () => {
      setShowResearchProgress(true);
    };

    window.addEventListener('showResearchProgress', handleShowResearchProgress);
    
    return () => {
      window.removeEventListener('showResearchProgress', handleShowResearchProgress);
    };
  }, []);

  if (authLoading) {
    console.log('🔍 AppContent: Rendering loading spinner (authLoading true)');
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {isAuthenticated ? (
        <Layout>
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent pb-8">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Dashboard />
                      </motion.div>
                    } 
                  />
                  <Route 
                    path="/research" 
                    element={
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ResearchGenerator />
                      </motion.div>
                    } 
                  />
                  <Route 
                    path="/reports" 
                    element={
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Reports />
                      </motion.div>
                    } 
                  />
                  <Route 
                    path="/analytics" 
                    element={
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Analytics />
                      </motion.div>
                    } 
                  />
                  <Route 
                    path="/templates" 
                    element={
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Templates />
                      </motion.div>
                    } 
                  />
                  <Route 
                    path="/search" 
                    element={
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Search />
                      </motion.div>
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Settings />
                      </motion.div>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Profile />
                      </motion.div>
                    } 
                  />
                  <Route 
                    path="/debug" 
                    element={
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Debug />
                      </motion.div>
                    } 
                  />
                  {/* Catch-all route for authenticated users */}
                  <Route 
                    path="*" 
                    element={
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                      >
                        {console.log('🔍 AppContent: Catch-all route triggered for path:', location.pathname + location.search)}
                        <Navigate to="/" replace />
                      </motion.div>
                    } 
                  />
                </Routes>
              </AnimatePresence>
            </main>
          </div>
        </Layout>
      ) : (
        <Routes>
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/signup" 
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            } 
          />
          <Route 
            path="/auth/google/callback" 
            element={<GoogleCallback />} 
          />
          <Route 
            path="*" 
            element={
              console.log('🔍 AppContent: Unauthenticated catch-all triggered for path:', location.pathname + location.search) || 
              <Navigate to="/login" replace />
            } 
          />
        </Routes>
      )}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg, #363636)',
            color: 'var(--toast-color, #fff)',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
                  {/* Research Progress Modal */}
            <ResearchProgress 
              isVisible={showResearchProgress} 
              onClose={() => setShowResearchProgress(false)} 
            />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <DarkModeProvider>
          <AuthProvider>
            <ResearchProvider>
              <AppContent />
            </ResearchProvider>
          </AuthProvider>
        </DarkModeProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;