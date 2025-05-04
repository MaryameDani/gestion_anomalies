export const getDesignTokens = (mode, role) => {
  // Role-specific colors matching your selection page
  const roleColors = {
    admin: "#3f51b5",   // Blue/Indigo for admin
    permanencierCamion: "#4caf50", // Green for permanencierCamion
    permanencierMachine: "#ff9800", // Orange for permanencierMachine
    permanencierMaintenanceDragline: "#f44336", // Red for maintenance Dragline
    permanencierMaintenanceEngin: "#9c27b0", // Purple for maintenance Engin
    Maintenancier: "#00bcd4", // Cyan for Maintenancier
  };

  // Get the primary color based on role
  const primaryColor = role && roleColors[role] ? roleColors[role] : "#1976d2"; // Default MUI blue

  return {
    palette: {
      mode,
      primary: {
        main: primaryColor,
      },
      ...(mode === "light"
        ? {
            // palette values for light mode
            background: {
              default: "#fff",
              paper: "#fff",
            },
            text: {
              primary: "#333333",
              secondary: "#666666",
            },
          }
        : {
            // palette values for dark mode
            background: {
              default: "#121212",
              paper: "#1e1e1e",
            },
            text: {
              primary: "#ffffff",
              secondary: "#b0b0b0",
            },
          }),
    },
  };
};