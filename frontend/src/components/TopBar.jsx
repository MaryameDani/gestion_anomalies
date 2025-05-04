"use client"

import { useState } from "react"
import { AppBar, Box, IconButton, Menu, MenuItem, Stack, Toolbar, useTheme, Typography, Tooltip } from "@mui/material"
import { styled, alpha } from "@mui/material/styles"
import MenuIcon from "@mui/icons-material/Menu"
import Person2OutlinedIcon from "@mui/icons-material/Person2Outlined"
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined"
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined"
import LogoutIcon from "@mui/icons-material/Logout"
import { useNavigate } from "react-router-dom"
import { logout } from "../utils/auth" // Importez le service d'authentification

const drawerWidth = 280
const collapsedWidth = 70

const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== "open",
// @ts-ignore
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: "none",
  borderBottom: `1px solid ${theme.palette.divider}`,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  ...(!open && {
    marginLeft: collapsedWidth,
    width: `calc(100% - ${collapsedWidth}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}))

const TopBar = ({ open, handleDrawerOpen, setMode }) => {
  const theme = useTheme()
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  const openUserMenu = Boolean(anchorEl)

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    // Fermer le menu immédiatement
    handleMenuClose()
    
    // Utiliser la fonction de déconnexion du service
    await logout()
    
    // Puis rediriger vers la page de connexion
    navigate("/", { replace: true })
  }

  const toggleTheme = () => {
    const newMode = theme.palette.mode === "light" ? "dark" : "light"
    localStorage.setItem("currentMode", newMode)
    setMode(newMode)
  }

  const PRIMARY_COLOR = "#8FB43A"

  return (
    <StyledAppBar position="fixed" 
// @ts-ignore
    open={open}>
      <Toolbar sx={{ minHeight: "64px !important" }}>
        {!open && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 2,
              color: PRIMARY_COLOR,
              backgroundColor: alpha(PRIMARY_COLOR, 0.1),
              "&:hover": {
                backgroundColor: alpha(PRIMARY_COLOR, 0.2),
              },
              width: 36,
              height: 36,
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{
            display: { xs: "none", sm: "block" },
            fontWeight: 600,
            color: theme.palette.text.primary,
          }}
        >
          Gestion des Anomalies
        </Typography>

        <Box flexGrow={1} />

        <Stack direction="row" alignItems="center" spacing={1}>
          <Tooltip title={theme.palette.mode === "dark" ? "Mode clair" : "Mode sombre"}>
            <IconButton
              onClick={toggleTheme}
              aria-label={theme.palette.mode === "dark" ? "switch to light mode" : "switch to dark mode"}
              sx={{
                backgroundColor: alpha(PRIMARY_COLOR, 0.1),
                color: PRIMARY_COLOR,
                "&:hover": {
                  backgroundColor: alpha(PRIMARY_COLOR, 0.2),
                },
                width: 36,
                height: 36,
              }}
            >
              {theme.palette.mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Profil utilisateur">
            <IconButton
              onClick={handleMenuOpen}
              aria-controls={openUserMenu ? "user-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={openUserMenu ? "true" : undefined}
              sx={{
                backgroundColor: alpha(PRIMARY_COLOR, 0.1),
                color: PRIMARY_COLOR,
                "&:hover": {
                  backgroundColor: alpha(PRIMARY_COLOR, 0.2),
                },
                width: 36,
                height: 36,
              }}
            >
              <Person2OutlinedIcon />
            </IconButton>
          </Tooltip>

          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={openUserMenu}
            onClose={handleMenuClose}
            MenuListProps={{
              "aria-labelledby": "user-button",
            }}
            PaperProps={{
              elevation: 3,
              sx: {
                overflow: "visible",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.15))",
                mt: 1.5,
                borderRadius: 2,
                minWidth: 180,
                "&:before": {
                  content: '""',
                  display: "block",
                  position: "absolute",
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: "background.paper",
                  transform: "translateY(-50%) rotate(45deg)",
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            <MenuItem
              onClick={handleLogout}
              sx={{
                py: 1.5,
                "&:hover": {
                  backgroundColor: alpha(PRIMARY_COLOR, 0.08),
                },
              }}
            >
              <LogoutIcon sx={{ mr: 1.5, fontSize: 20, color: theme.palette.text.secondary }} />
              <Typography>Déconnexion</Typography>
            </MenuItem>
          </Menu>
        </Stack>
      </Toolbar>
    </StyledAppBar>
  )
}

export default TopBar