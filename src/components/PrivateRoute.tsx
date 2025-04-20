import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredType?: 'user' | 'agent';
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredType }) => {
  const { currentUser, userType, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }
  
  // Not logged in
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  // User type check if required
  if (requiredType && userType !== requiredType) {
    // Instead of redirecting, show an access denied message
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-700 mb-6">
            You don't have permission to access this page. 
            You are logged in as a {userType}, but this page requires a {requiredType}.
          </p>
          <div className="flex justify-center space-x-4">
            {userType === 'user' ? (
              <a 
                href="/dashboard" 
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              >
                Go to User Dashboard
              </a>
            ) : (
              <a 
                href="/agent-dashboard" 
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              >
                Go to Agent Dashboard
              </a>
            )}
            <a 
              href="/login" 
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Logout
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};

export default PrivateRoute; 