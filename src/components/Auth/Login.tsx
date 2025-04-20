import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'user' | 'agent'>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  
  const { login, checkUserType } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      setAccessDenied(false);
      
      // First authenticate the user
      await login(email, password);
      
      // If user selected agent login, check if they have agent permissions
      if (userType === 'agent') {
        const actualUserType = await checkUserType();
        
        if (actualUserType !== 'agent') {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      }
      
      // Navigate to the appropriate dashboard based on selected user type
      if (userType === 'user') {
        navigate('/dashboard');
      } else {
        navigate('/agent-dashboard');
      }
    } catch (error: any) {
      setError('Failed to sign in: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-purple-600 mb-6">Women Safety System</h2>
        <h3 className="text-xl font-semibold text-center mb-4">Sign In</h3>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {accessDenied && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
            <span className="block sm:inline">Access Denied: You don't have permission to log in as an agent.</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Login As
            </label>
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-purple-600"
                  name="loginType"
                  value="user"
                  checked={userType === 'user'}
                  onChange={() => setUserType('user')}
                />
                <span className="ml-2">User</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio text-purple-600"
                  name="loginType"
                  value="agent"
                  checked={userType === 'agent'}
                  onChange={() => setUserType('agent')}
                />
                <span className="ml-2">Helpline Agent</span>
              </label>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-purple-600 hover:text-purple-800">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 