export const getDesignTokens = (mode, role) => {
  const primaryColor ="#1976d2"; // Default MUI blue

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
              primary: "#5F6B38",
              secondary: "#ffffff",
            }
          }),
    },
  };
};