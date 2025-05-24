"use client"

import { useState, useEffect } from "react"
import { styled, useTheme } from "@mui/material/styles"
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Drawer as MuiDrawer,
  Divider,
  Typography,
  IconButton,
  Avatar,
  Tooltip,
  alpha,
} from "@mui/material"
import { useNavigate, useLocation } from "react-router-dom"

// Icons
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ExpandLess from "@mui/icons-material/ExpandLess"
import ExpandMore from "@mui/icons-material/ExpandMore"
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined"
import HistoryIcon from "@mui/icons-material/History"
import DescriptionIcon from "@mui/icons-material/Description"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import ReportProblemIcon from "@mui/icons-material/ReportProblem"
import EditIcon from "@mui/icons-material/Edit"
import VisibilityIcon from "@mui/icons-material/Visibility"
import TrackChangesIcon from "@mui/icons-material/TrackChanges"
import ExitToAppIcon from "@mui/icons-material/ExitToApp"
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount"

import { getCurrentUser, getUserRole } from "../utils/auth"

// Constants
const drawerWidth = 280
const collapsedWidth = 70
const PRIMARY_COLOR = "#8FB43A"
const HOVER_COLOR = alpha("#8FB43A", 0.08)
const SELECTED_BG = alpha("#8FB43A", 0.12)

// Styled components
const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(0, 2),
  ...theme.mixins.toolbar,
}))

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== "open" })(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  "& .MuiDrawer-paper": {
    width: open ? drawerWidth : collapsedWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    backgroundColor: "#F8FBF1",
    borderRight: "none", // Suppression de la bordure
    boxShadow: theme.shadows[3],
    overflowX: "hidden",
  },
}))

// Menu items configuration
const menuItemsConfig = {
  admin: {
    main: [
      {
        text: "Tableau de bord",
        icon: <DashboardOutlinedIcon />,
        path: "/admin/dashboard",
      },
      {
        text: "Historique des anomalies",
        icon: <HistoryIcon />,
        path: "/admin/historiques",
      },
      {
        text: "Rapports",
        icon: <DescriptionIcon />,
        path: "/admin/genererRapport",
        children: [
          { text: "Générer un rapport", path: "/admin/genererRapport" },
          { text: "Rapports sauvegardés", path: "/admin/rapportsSauvegardes" },
        ],
      },
    ],
  },
  permanencierCamion: {
    main: [
      { text: "Tableau de bord", icon: <DashboardOutlinedIcon />, path: "/permanencierCamion/dashboard" },
      { text: "Anomalie", icon: <ReportProblemIcon />, path: "/permanencierCamion/ticket" },
      { text: "Fin de poste", icon: <ExitToAppIcon />, path: "/permanencierCamion/formulaireFin" },
      { text: "Gestion des anomalies", icon: <TrackChangesIcon />, path: "/permanencierCamion/gestion_ticket" },
    ],
  },
  permanencierMachine: {
    main: [
      { text: "Tableau de bord", icon: <DashboardOutlinedIcon />, path: "/permanencierMachine/dashboard" },
      { text: "Anomalie", icon: <ReportProblemIcon />, path: "/permanencierMachine/ticket" },
      { text: "Fin de poste", icon: <ExitToAppIcon />, path: "/permanencierMachine/formulaireFin" },
      { text: "Gestion des anomalies", icon: <TrackChangesIcon />, path: "/permanencierMachine/gestion_ticket" },
    ],
  },
  permanencierMaintenanceDragline: {
    main: [
      { text: "Tableau de bord", icon: <DashboardOutlinedIcon />, path: "/permanencierMaintenanceDragline/dashboard" },
      {
        text: "Anomalies",
        icon: <SupervisorAccountIcon />,
        path: "/permanencierMaintenanceDragline/SuperviserAnomalies",
      },
    ],
  },
  permanencierMaintenanceEngin: {
    main: [
      { text: "Tableau de bord", icon: <DashboardOutlinedIcon />, path: "/permanencierMaintenanceEngin/dashboard" },
      {
        text: "Anomalies",
        icon: <SupervisorAccountIcon />,
        path: "/permanencierMaintenanceEngin/SuperviserAnomalies",
      },
    ],
  },
  Maintenancier: {
    main: [
      { text: "Tableau de bord", icon: <DashboardOutlinedIcon />, path: "/Maintenancier/dashboard" },
      { text: "Les anomalies", icon: <SupervisorAccountIcon />, path: "/Maintenancier/SuperviserAnomalies" },
    ],
  },
}

// Helper function to get role details
const getRoleDetails = (role) => {
  const roleNames = {
    admin: "Administrateur",
    permanencierCamion: "Permanencier Camion",
    permanencierMachine: "Permanencier Machine",
    permanencierMaintenanceDragline: "Maintenance Dragline",
    permanencierMaintenanceEngin: "Maintenance Engin",
    Maintenancier: "Maintenancier"
  }

  const defaultRole = {
    name: roleNames[role] || "Utilisateur",
    role: roleNames[role] || "Invité",
    menuItems: menuItemsConfig.permanencierMaintenanceDragline,
  }

  const roleConfig = menuItemsConfig[role]

  if (!roleConfig) return defaultRole

  return {
    name: role === "admin" ? "Admin User" : roleNames[role] || role,
    role: role === "admin" ? "Administrateur" : roleNames[role] || role,
    menuItems: roleConfig,
  }
}

const Sidebar = ({ open, handleDrawerClose }) => {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeItem, setActiveItem] = useState("")
  const [openSubMenus, setOpenSubMenus] = useState({})

  // Get current user and role
  const currentUser = getCurrentUser()
  const userRole = getUserRole()

  const roleInfo = getRoleDetails(userRole)
  const { menuItems } = roleInfo

  const name = currentUser?.full_name || roleInfo.name
  const roleName = currentUser?.role || roleInfo.role

  // Update active item based on current path
  useEffect(() => {
    setActiveItem(location.pathname)

    // Check if we need to open any parent menus based on the current path
    menuItems.main.forEach((item) => {
      if (item.children) {
        const shouldOpen = item.children.some((child) => child.path === location.pathname)
        if (shouldOpen) {
          setOpenSubMenus((prev) => ({ ...prev, [item.text]: true }))
        }
      }
    })
  }, [location.pathname, menuItems.main])

  const handleNavigation = (path) => {
    setActiveItem(path)
    navigate(path)
  }

  const handleSubMenuToggle = (menuName) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [menuName]: !prev[menuName],
    }))
  }

  const renderMenuItems = (items) => {
    return items.map((item) => {
      const isActive =
        activeItem === item.path || (item.children && item.children.some((child) => child.path === activeItem))
      const hasChildren = item.children && item.children.length > 0
      const isSubMenuOpen = openSubMenus[item.text]

      return (
        <div key={item.text}>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <Tooltip title={!open ? item.text : ""} placement="right" arrow>
              <ListItemButton
                onClick={() => (hasChildren ? handleSubMenuToggle(item.text) : handleNavigation(item.path))}
                sx={{
                  minHeight: 48,
                  px: open ? 2.5 : 1.5,
                  py: 1,
                  mx: open ? 1 : 0.5,
                  borderRadius: "10px",
                  backgroundColor: isActive ? SELECTED_BG : "transparent",
                  color: isActive ? PRIMARY_COLOR : theme.palette.text.primary,
                  "&:hover": {
                    backgroundColor: HOVER_COLOR,
                  },
                  transition: theme.transitions.create(["background-color", "color", "box-shadow"], {
                    duration: theme.transitions.duration.standard,
                  }),
                  ...(isActive && {
                    boxShadow: `0 2px 10px 0 ${alpha(PRIMARY_COLOR, 0.2)}`,
                  }),
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : "auto",
                    justifyContent: "center",
                    color: isActive ? PRIMARY_COLOR : theme.palette.text.secondary,
                    transition: theme.transitions.create("color", {
                      duration: theme.transitions.duration.standard,
                    }),
                    fontSize: 20,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    opacity: open ? 1 : 0,
                    ml: 0.5,
                    "& .MuiTypography-root": {
                      fontWeight: isActive ? 600 : 400,
                      fontSize: "0.95rem",
                      transition: theme.transitions.create("font-weight", {
                        duration: theme.transitions.duration.standard,
                      }),
                    },
                  }}
                />
                {hasChildren && open && (
                  <Box
                    sx={{
                      backgroundColor: isSubMenuOpen ? alpha(PRIMARY_COLOR, 0.1) : "transparent",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      p: 0.5,
                      transition: theme.transitions.create("background-color", {
                        duration: theme.transitions.duration.standard,
                      }),
                    }}
                  >
                    {isSubMenuOpen ? <ExpandLess /> : <ExpandMore />}
                  </Box>
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>

          {hasChildren && open && (
            <Collapse in={isSubMenuOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ mt: 0.5, mb: 1 }}>
                {item.children.map((child) => {
                  const isChildActive = activeItem === child.path

                  return (
                    <ListItem disablePadding key={child.path} sx={{ pl: 2 }}>
                      <ListItemButton
                        onClick={() => handleNavigation(child.path)}
                        sx={{
                          minHeight: 36,
                          py: 0.75,
                          px: 1.5,
                          ml: 3,
                          mr: 1,
                          borderRadius: "8px",
                          backgroundColor: isChildActive ? SELECTED_BG : "transparent",
                          color: isChildActive ? PRIMARY_COLOR : theme.palette.text.secondary,
                          "&:hover": {
                            backgroundColor: HOVER_COLOR,
                          },
                          transition: theme.transitions.create(["background-color", "color"], {
                            duration: theme.transitions.duration.standard,
                          }),
                          position: "relative",
                          "&:before": {
                            content: '""',
                            position: "absolute",
                            left: -10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: isChildActive ? PRIMARY_COLOR : theme.palette.text.disabled,
                          },
                        }}
                      >
                        <ListItemText
                          primary={child.text}
                          primaryTypographyProps={{
                            fontSize: "0.875rem",
                            fontWeight: isChildActive ? 600 : 400,
                            // @ts-ignore
                            transition: theme.transitions.create("font-weight", {
                              duration: theme.transitions.duration.standard,
                            }),
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  )
                })}
              </List>
            </Collapse>
          )}
        </div>
      )
    })
  }

  return (
    <Drawer variant="permanent" open={open}>
      <DrawerHeader>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: open ? "flex-start" : "center",
            width: "100%",
          }}
        >
        </Box>
        {open && (
          <IconButton
            onClick={handleDrawerClose}
            sx={{
              backgroundColor: alpha(PRIMARY_COLOR, 0.1),
              color: PRIMARY_COLOR,
              "&:hover": {
                backgroundColor: alpha(PRIMARY_COLOR, 0.2),
              },
              width: 30,
              height: 30,
            }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        )}
      </DrawerHeader>

      <Divider sx={{ mx: 2, opacity: 0.6 }} />

      <Box sx={{ mt: 2, px: 2 }}>
        {open && (
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: theme.palette.text.disabled,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              ml: 1,
              mb: 1,
            }}
          >
            Menu Principal
          </Typography>
        )}
      </Box>

      <List sx={{ px: open ? 1 : 0, mt: 1 }}>{renderMenuItems(menuItems.main)}</List>

      {menuItems.tools && (
        <>
          <Divider sx={{ my: 2, mx: 2, opacity: 0.6 }} />
          {open && (
            <Box sx={{ px: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: theme.palette.text.disabled,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  ml: 1,
                  mb: 1,
                }}
              >
                Outils
              </Typography>
            </Box>
          )}
          <List sx={{ px: open ? 1 : 0, mt: 1 }}>{renderMenuItems(menuItems.tools)}</List>
        </>
      )}

      {menuItems.analytics && (
        <>
          <Divider sx={{ my: 2, mx: 2, opacity: 0.6 }} />
          {open && (
            <Box sx={{ px: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: theme.palette.text.disabled,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  ml: 1,
                  mb: 1,
                }}
              >
                Analytiques
              </Typography>
            </Box>
          )}
          <List sx={{ px: open ? 1 : 0, mt: 1 }}>{renderMenuItems(menuItems.analytics)}</List>
        </>
      )}

      <Box sx={{ flexGrow: 1 }} />

      {open ? (
        <Box
          sx={{
            mx: 2,
            mb: 2,
            p: 2,
            borderRadius: 2,
            backgroundColor: alpha(PRIMARY_COLOR, 0.08),
            boxShadow: `0 2px 10px 0 ${alpha(theme.palette.common.black, 0.05)}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                backgroundColor: alpha(PRIMARY_COLOR, 0.2),
                color: PRIMARY_COLOR,
                fontWeight: 700,
              }}
            >
              {name.charAt(0)}
            </Avatar>
            <Box sx={{ ml: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                {name}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                {roleName}
              </Typography>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <Tooltip title={name} placement="right" arrow>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                backgroundColor: alpha(PRIMARY_COLOR, 0.2),
                color: PRIMARY_COLOR,
                fontWeight: 700,
                boxShadow: `0 2px 10px 0 ${alpha(theme.palette.common.black, 0.1)}`,
              }}
            >
              {name.charAt(0)}
            </Avatar>
          </Tooltip>
        </Box>
      )}
    </Drawer>
  )
}

export default Sidebar
