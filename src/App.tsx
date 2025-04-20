import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import UserDashboard from './components/User/UserDashboard';
import AgentDashboard from './components/Agent/AgentDashboard';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Private Routes */}
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute requiredType="user">
                <UserDashboard />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/agent-dashboard" 
            element={
              <PrivateRoute requiredType="agent">
                <AgentDashboard />
              </PrivateRoute>
            } 
          />
          
          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" />} />
          
          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
