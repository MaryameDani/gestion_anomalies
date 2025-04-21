// Updated getDesignTokens function
export const getDesignTokens = (mode, role) => {
  // Role-specific colors matching your selection page
  const roleColors = {
    admin: "#3f51b5",   // Blue/Indigo for admin
    teacher: "#4caf50", // Green for teacher
    student: "#ff9800", // Orange for student (the original color from your selection page)
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
              default: "#f5f5f5",
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