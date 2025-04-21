"use client";
import { useState } from "react";
import {
  AppBar,
  Box,
  Toolbar,
  IconButton,
  Typography,
  Menu,
  Container,
  Button,
  MenuItem,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SchoolIcon from "@mui/icons-material/School";
import { useNavigate } from "react-router-dom";

const pages = ["Accueil", "Fonctionnalités", "Avantages"];

export default function Navbar() {
  const [anchorElNav, setAnchorElNav] = useState(null);
  const navigate = useNavigate();

  const handleOpenNavMenu = (event) => setAnchorElNav(event.currentTarget);
  const handleCloseNavMenu = () => setAnchorElNav(null);

  const scrollToSection = (sectionId) => {
    handleCloseNavMenu();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <AppBar position="sticky" color="default" elevation={1} sx={{ backgroundColor: "white" }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo Desktop */}
          <SchoolIcon sx={{ display: { xs: "none", md: "flex" }, mr: 1, color: "primary.main" }} />
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: "none", md: "flex" },
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".2rem",
              color: "primary.main",
              textDecoration: "none",
            }}
          >
            EduPredict
          </Typography>

          {/* Menu Mobile */}
          <Box sx={{ flexGrow: 1, display: { xs: "flex", md: "none" } }}>
            <IconButton size="large" onClick={handleOpenNavMenu} color="primary">
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={anchorElNav}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: "block", md: "none" } }}
            >
              {pages.map((page) => (
                <MenuItem key={page} onClick={() => scrollToSection(page.toLowerCase())}>
                  <Typography textAlign="center">{page}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Logo Mobile */}
          <SchoolIcon sx={{ display: { xs: "flex", md: "none" }, mr: 1, color: "primary.main" }} />
          <Typography
            variant="h5"
            noWrap
            component="a"
            href="/"
            sx={{
              mr: 2,
              display: { xs: "flex", md: "none" },
              flexGrow: 1,
              fontFamily: "monospace",
              fontWeight: 700,
              letterSpacing: ".2rem",
              color: "primary.main",
              textDecoration: "none",
            }}
          >
            EduPredict
          </Typography>

          {/* Menu Desktop */}
          <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, justifyContent: "center" }}>
            {pages.map((page) => (
              <Button
                key={page}
                onClick={() => scrollToSection(page.toLowerCase())}
                sx={{ my: 2, color: "text.primary", mx: 1 }}
              >
                {page}
              </Button>
            ))}
          </Box>

          {/* Bouton Connexion */}
          <Box sx={{ flexGrow: 0 }}>
            <Button variant="contained" color="primary" onClick={() => navigate("/login")} sx={{ px: 3 }}>
              Connexion
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
