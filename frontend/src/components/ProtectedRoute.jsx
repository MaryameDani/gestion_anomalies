import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAuthenticated, checkAuthStatus, getCurrentUser } from '../utils/auth';

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(false);
  const location = useLocation();

  // Vérification de l'authentification
  const verifyAuth = async () => {
    try {
      // Vérifier si l'utilisateur est déjà authentifié localement
      if (isAuthenticated()) {
        const currentUser = getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          setIsChecking(false);
          
          // Vérifier quand même auprès du serveur en arrière-plan
          checkAuthStatus().catch(error => {
            console.warn("Erreur de vérification en arrière-plan:", error);
            // Nous ne changeons pas l'état ici car l'utilisateur est déjà chargé
          });
          
          return;
        }
      }

      // Si pas authentifié localement, vérifier auprès du serveur
      const userData = await checkAuthStatus();
      
      if (!userData) {
        // Si pas de données utilisateur, considérer comme non authentifié
        setAuthError(true);
        return;
      }
      
      setUser(userData);
    } catch (error) {
      console.error("Erreur de vérification d'authentification:", error);
      setAuthError(true);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    verifyAuth();
  }, []);

  // Afficher un loader pendant la vérification
  if (isChecking) {
    return <div className="loading-spinner">Chargement...</div>;
  }

  // Si l'utilisateur n'est pas authentifié ou s'il y a eu une erreur d'authentification, redirection
  if (!user || authError) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Si des rôles sont requis, vérifier si l'utilisateur a le bon rôle
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Rediriger vers une page d'accès refusé ou la page d'accueil
    return <Navigate to="/access-denied" state={{ from: location }} replace />;
  }

  // Si tout est OK, afficher le contenu protégé
  return <Outlet />;
};

export default ProtectedRoute;