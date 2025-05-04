import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Alert,
  CircularProgress,
  Avatar,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton
} from "@mui/material";
import { Person, Visibility, VisibilityOff } from "@mui/icons-material";
import { login, isAuthenticated, getUserRole } from "../utils/auth";

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    if (isAuthenticated()) {
      redirectToDashboard();
    }
  }, []);

  const redirectToDashboard = () => {
    const role = getUserRole();
    // Rediriger vers le dashboard approprié selon le rôle
    switch (role) {
      case "admin":
        navigate("/admin/dashboard", { replace: true });
        break;
      case "permanencierCamion":
        navigate("/permanencierCamion/dashboard", { replace: true });
        break;
      case "permanencierMachine":
        navigate("/permanencierMachine/dashboard", { replace: true });
        break;
      case "permanencierMaintenanceDragline":
        navigate("/permanencierMaintenanceDragline/dashboard", { replace: true });
        break;
      case "permanencierMaintenanceEngin":
        navigate("/permanencierMaintenanceEngin/dashboard", { replace: true });
        break;
      case "Maintenancier":
        navigate("/Maintenancier/dashboard", { replace: true });
        break;
      default:
        // Si rôle non reconnu, rester sur la page de login
        setError("Rôle non reconnu. Veuillez contacter l'administrateur.");
        break;
    }
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === "rememberMe" ? checked : value
    });
  };

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Appel à l'API de connexion via le service authService
      await login({ 
        username: formData.username, 
        password: formData.password,
        rememberMe: formData.rememberMe
      });

      // Attendre un court instant pour que le localStorage soit mis à jour
      setTimeout(() => {
        if (isAuthenticated()) {
          redirectToDashboard();
        } else {
          setError("Échec de l'authentification");
          setLoading(false);
        }
      }, 100);
    } catch (err) {
      setError(err.message || "Échec de la connexion");
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "rgb(226, 233, 192)",
        p: 2,
      }}
    >
      <Card sx={{ width: "100%", maxWidth: "450px" }}>
        <CardHeader
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
          title={
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: "rgba(143, 180, 58, 0.55)",
                  mb: 2,
                }}
              >
                <Person sx={{ color: "#8FB43A", fontSize: 32 }} />
              </Avatar>
              <Typography variant="h5" component="h1" fontWeight="bold">
                Connexion
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Entrez vos identifiants pour accéder à votre compte
              </Typography>
            </Box>
          }
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Nom d'utilisateur"
              name="username"
              autoComplete="username"
              value={formData.username}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Mot de passe"
              type={showPassword ? "text" : "password"}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label="toggle password visibility" onClick={handleTogglePassword} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  name="rememberMe"
                  color="primary"
                />
              }
              label="Se souvenir de moi"
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 2,
                mb: 2,
                bgcolor: "#8FB43A",
                "&:hover": { bgcolor: "rgba(143, 180, 58, 0.9)" },
                py: 1.5,
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Se connecter"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginForm;