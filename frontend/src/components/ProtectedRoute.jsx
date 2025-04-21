// src/components/ProtectedRoute.jsx
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { checkAuthStatus } from '../utils/auth';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children, requiredRole }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      const user = await checkAuthStatus();
      
      if (user && (!requiredRole || user.role === requiredRole)) {
        setIsAuth(true);
      } else {
        setIsAuth(false);
      }
      
      setIsLoading(false);
    };
    
    verifyAuth();
  }, [requiredRole]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuth) {
    // Redirect to login with the required role if specified
    return <Navigate to={requiredRole ? `/login/${requiredRole}` : '/login'} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;