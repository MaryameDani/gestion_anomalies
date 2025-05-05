/**
 * Service centralisé pour gérer l'authentification
 */

// URL de base de l'API
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns {boolean} True si l'utilisateur est authentifié
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('accessToken');
  return !!token;
};

/**
 * Récupère l'utilisateur actuel depuis le sessionStorage
 * @returns {Object|null} Les données utilisateur ou null
 */
export const getCurrentUser = () => {
  try {
    const userStr = sessionStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error("Erreur lors de la récupération des données utilisateur:", error);
    return null;
  }
};

/**
 * Récupère le rôle de l'utilisateur actuel
 * @returns {string|null} Le rôle utilisateur pour le routage
 */
export const getUserRole = () => {
  try {
    const userDetails = localStorage.getItem('userDetails');
    if (!userDetails) return null;
    
    const details = JSON.parse(userDetails);
    const userType = details.user_type;
    
    // Adapter les rôles de l'API aux rôles des routes
    const roleMapping = {
      "ADMINISTRATEUR": "admin",
      "PERMANENCIER_CAMION": "permanencierCamion",
      "PERMANENCIER_MACHINE": "permanencierMachine",
      "PERMANENCIER_MAINTENANCE_DRAGLINE": "permanencierMaintenanceDragline",
      "PERMANENCIER_MAINTENANCE_ENGINS": "permanencierMaintenanceEngin",
      "MAINTENANCIER": "Maintenancier"
    };
    
    return roleMapping[userType] || null;
  } catch (error) {
    console.error("Erreur lors de la récupération des détails utilisateur:", error);
    return null;
  }
};

/**
 * Authentifie l'utilisateur et stocke les tokens
 * @param {Object} credentials - Informations d'identification (username, password)
 * @returns {Promise<Object>} Les données de l'utilisateur authentifié
 */
export const login = async (credentials) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Échec de connexion');
    }

    // Stocker les tokens et les données utilisateur
    localStorage.setItem('accessToken', data.access);
    localStorage.setItem('refreshToken', data.refresh);
    
    // Compatibilité avec le code existant
    localStorage.setItem('userToken', data.access);
    
    if (data.user) {
      localStorage.setItem('userDetails', JSON.stringify(data.user));
      sessionStorage.setItem('currentUser', JSON.stringify(data.user));
    }

    return data;
  } catch (error) {
    console.error('Erreur de connexion:', error);
    throw error;
  }
};

/**
 * Déconnecte l'utilisateur en supprimant les tokens
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    // Faire la requête de déconnexion à l'API (ne pas attendre la réponse)
    fetch(`${API_BASE_URL}/logout/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
        'Content-Type': 'application/json'
      },
    }).catch(() => {
      // Ignorer les erreurs de l'API
      console.log("Erreur API ignorée pendant la déconnexion")
    });
    
    // Nettoyer les données locales
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userToken');
    localStorage.removeItem('userDetails');
    sessionStorage.removeItem('currentUser');

    // Ne pas rediriger ici - laisser le composant gérer la redirection
  } catch (error) {
    console.error('Erreur de déconnexion:', error);
    // Même en cas d'erreur, supprimer les données locales
    localStorage.clear();
    sessionStorage.clear();
  }
};

/**
 * Rafraîchir le token d'accès
 * @returns {Promise<string|null>} Le nouveau token ou null
 */
export const refreshToken = async () => {
  try {
    const refresh = localStorage.getItem('refreshToken');
    if (!refresh) return null;

    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh }),
    });

    const data = await response.json();

    if (response.ok && data.access) {
      // Mettre à jour tous les tokens d'accès
      localStorage.setItem('accessToken', data.access);
      localStorage.setItem('userToken', data.access);
      return data.access;
    } else {
      // Si le refresh échoue, déconnexion
      await logout();
      return null;
    }
  } catch (error) {
    console.error('Erreur de rafraîchissement du token:', error);
    await logout();
    return null;
  }
};

/**
 * Vérifie l'état de l'authentification auprès de l'API
 * @returns {Promise<Object|null>} Les données utilisateur ou null
 */
export const checkAuthStatus = async () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return null;
  }

  try {
    // Vérifier l'état de l'authentification
    const response = await fetch(`${API_BASE_URL}/user-info/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      redirect: 'error' // Éviter les redirections
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expiré, essayer de le rafraîchir
        const newToken = await refreshToken();
        if (newToken) {
          // Réessayer avec le nouveau token
          return checkAuthStatus();
        }
      }
      return null;
    }

    const data = await response.json();
    
    if (data.user) {
      // Mettre à jour les données utilisateur
      sessionStorage.setItem('currentUser', JSON.stringify(data.user));
      return data.user;
    } else {
      sessionStorage.removeItem('currentUser');
      return null;
    }
  } catch (error) {
    console.error('Erreur de vérification de l\'authentification:', error);
    return null;
  }
};

/**
 * Configure un intercepteur pour les requêtes API qui gère automatiquement
 * le rafraîchissement des tokens expirés
 */
export const setupAxiosInterceptors = (axios) => {
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // Si l'erreur est 401 et que nous n'avons pas déjà tenté de rafraîchir
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Tenter de rafraîchir le token
          const newToken = await refreshToken();
          if (newToken) {
            // Mettre à jour le header et réessayer
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return axios(originalRequest);
          }
        } catch (refreshError) {
          // Échec du rafraîchissement, déconnexion
          await logout();
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );
};