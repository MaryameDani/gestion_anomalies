import React, { useState, useEffect } from "react";
import { styled, ThemeProvider, createTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import { getDesignTokens } from "./theme";
import { Outlet, useLocation } from "react-router-dom";

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const DashboardLayout = ({ role }) => {
  // Set default state to true to open the sidebar by default
  const [open, setOpen] = useState(true);
  const location = useLocation();

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const [mode, setMode] = useState(
    Boolean(localStorage.getItem("currentMode"))
      ? localStorage.getItem("currentMode")
      : "light"
  );

  const theme = React.useMemo(
    () => createTheme(getDesignTokens(mode, role)), 
    [mode, role]
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <TopBar 
          open={open} 
          handleDrawerOpen={handleDrawerOpen} 
          setMode={setMode}
          // @ts-ignore
          role={role}
        />
        <Sidebar 
          open={open} 
          handleDrawerClose={handleDrawerClose} 
          // @ts-ignore
          role={role}
          // @ts-ignore
          pathname={location.pathname}
        />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <DrawerHeader />
          <Outlet />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default DashboardLayout;