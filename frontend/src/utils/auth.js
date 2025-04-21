export const isAuthenticated = () => {
  const accessToken = localStorage.getItem('accessToken');
  return !!accessToken;
};

export const getCurrentUser = () => {
  return JSON.parse(sessionStorage.getItem('currentUser'));
};

export const getUserRole = () => {
  const user = getCurrentUser();
  return user ? user.role : null;
};

export const logout = async () => {
  try {
    await fetch('http://localhost:8000/api/logout/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('currentUser');
    window.location.href = '/login'; // Redirect to login page
  } catch (error) {
    console.error('Logout error:', error);
  }
};
export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    const response = await fetch('http://localhost:8000/api/token/refresh/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    const data = await response.json();
    if (response.ok && data.access) {
      localStorage.setItem('accessToken', data.access);
      return data.access;
    } else {
      logout(); // Log out the user if the refresh fails
      return null;
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    logout(); // Log out the user if an error occurs
    return null;
  }
};

export const checkAuthStatus = async () => {
  try {
    let token = localStorage.getItem('accessToken');
    let response = await fetch('http://localhost:8000/api/user-info/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // If the request fails with a 401 error, try refreshing the token
    if (response.status === 401) {
      const newToken = await refreshToken();
      if (newToken) {
        // Retry the request with the new token
        response = await fetch('http://localhost:8000/api/user-info/', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${newToken}`,
          },
        });
      } else {
        // Log out the user if the refresh fails
        logout();
        return null;
      }
    }

    const data = await response.json();

    if (response.ok && data.success) {
      sessionStorage.setItem('currentUser', JSON.stringify(data.user));
      return data.user;
    } else {
      sessionStorage.removeItem('currentUser');
      return null;
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return null;
  }
};

export const fetchWithTokenRefresh = async (url, options = {}) => {
  try {
    // Get the current access token
    let token = localStorage.getItem('accessToken');

    // Add the Authorization header to the request
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    // Make the initial request
    let response = await fetch(url, options);

    // If the request fails with a 401 error, try refreshing the token
    if (response.status === 401) {
      const newToken = await refreshToken();
      if (newToken) {
        // Update the Authorization header with the new token
        options.headers.Authorization = `Bearer ${newToken}`;

        // Retry the request with the new token
        response = await fetch(url, options);
      } else {
        // Log out the user if the refresh fails
        logout();
        return null;
      }
    }

    return response;
  } catch (error) {
    console.error('Fetch with token refresh error:', error);
    throw error;
  }
};