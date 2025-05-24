"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  CardActions,
  Fab,
  Dialog,
  DialogContent,
  AppBar,
  Toolbar,
  Slide,
  Container,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Description as DescriptionIcon,
  Schedule as ScheduleIcon, 
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material";

// Custom theme with green primary color
import { createTheme, ThemeProvider } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#B7CE66", // Green
    },
  },
});

// Configure Axios with base URL
const api = axios.create({
  baseURL: "http://localhost:8000",
});

// Configure Axios with JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Transition for full-screen dialog
const Transition = React.forwardRef(function Transition(props, ref) {
  // @ts-ignore
  return <Slide direction="up" ref={ref} {...props} />;
});

const PermanencierCamionTicket = () => {
  const [tickets, setTickets] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [pannes, setPannes] = useState([]);
  const [maintenanceUsers, setMaintenanceUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [openDialog, setOpenDialog] = useState(false);

  // State for ticket creation form
  const [nouveauTicket, setNouveauTicket] = useState({
    vehicule: "",
    utilisateur_assigne: "",
    anomalies: [],
    anomalies_personnalisees: "",
    gravite: "MOYENNE",
    description: "",
    poste: "",
  });

  const [formErrors, setFormErrors] = useState({
    vehicule: null,
    anomalies: null,
    gravite: null,
    poste: null,
    utilisateur_assigne: null,
  });

  const [selectedAnomalies, setSelectedAnomalies] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          ticketsResponse,
          vehiculesResponse,
          pannesResponse,
          maintenanceUsersResponse,
        ] = await Promise.all([
          api.get("/api/tickets/suivre/"),
          api.get("/api/vehicules/"),
          api.get("/api/pannes/"),
          api.get(
            "/api/utilisateurs-par-type/?user_type=PERMANENCIER_MAINTENANCE_ENGINS&PERMANENCIER_MAINTENANCE_DRAGLINE"
          ),
        ]);

        // Handle tickets data and filter out 'CLOTURE' tickets
        if (Array.isArray(ticketsResponse.data)) {
          const activeTickets = ticketsResponse.data.filter(
            (ticket) => ticket.statut !== "CLOTURE"
          );
          setTickets(activeTickets);
        } else {
          console.error("Unexpected tickets data format:", ticketsResponse.data);
          setTickets([]);
          showAlert("Error loading tickets", "error");
        }

        // Handle vehicles data
        if (Array.isArray(vehiculesResponse.data)) {
          setVehicules(vehiculesResponse.data);
        } else {
          console.error("Unexpected vehicles data format:", vehiculesResponse.data);
          setVehicules([]);
        }

        // Handle breakdowns data
        if (Array.isArray(pannesResponse.data)) {
          setPannes(pannesResponse.data);
          const initialSelectedAnomalies = {};
          pannesResponse.data.forEach((panne) => {
            initialSelectedAnomalies[panne.id] = false;
          });
          setSelectedAnomalies(initialSelectedAnomalies);
        } else {
          console.error("Unexpected breakdowns data format:", pannesResponse.data);
          setPannes([]);
        }

        // Handle maintenance users data
        if (
          maintenanceUsersResponse.data &&
          maintenanceUsersResponse.data.success &&
          Array.isArray(maintenanceUsersResponse.data.utilisateurs)
        ) {
          setMaintenanceUsers(maintenanceUsersResponse.data.utilisateurs);
        } else {
          console.error(
            "Unexpected maintenance users data format:",
            maintenanceUsersResponse.data
          );
          setMaintenanceUsers([]);
        }
      } catch (error) {
        console.error("Error retrieving data:", error);
        showAlert("Error loading data", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("fr-FR");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "NOUVEAU":
        return "primary";
      case "EN_COURS":
        return "warning";
      case "RESOLU":
        return "success";
      case "CLOTURE":
        return "default";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "NOUVEAU":
        return "NOUVEAU";
      case "EN_COURS":
        return "EN COURS";
      case "RESOLU":
        return "RESOLU";
      case "CLOTURE":
        return "CLOTURE";
      default:
        return status;
    }
  };

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case "CRITIQUE":
        return "CRITIQUE";
      case "MOYENNE":
        return "MOYENNE";
      case "GRAVE":
        return "GRAVE";
      case "LEGERE":
        return "LEGERE";
      default:
        return severity;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "CRITIQUE":
        return "error";
      case "GRAVE":
        return "error";
      case "MOYENNE":
        return "warning";
      case "LEGERE":
        return "info";
      default:
        return "default";
    }
  };

  // --- Ticket form handling functions ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNouveauTicket({
      ...nouveauTicket,
      [name]: value,
    });
    setFormErrors((prevErrors) => ({
      ...prevErrors,
      [name]: null,
    }));
  };

  const handleVehiculeChange = (event) => {
    setNouveauTicket({
      ...nouveauTicket,
      vehicule: event.target.value,
    });
    setFormErrors((prevErrors) => ({
      ...prevErrors,
      vehicule: null,
    }));
  };

  const handleAnomalieCheckboxChange = (id) => {
    setSelectedAnomalies((prevSelectedAnomalies) => ({
      ...prevSelectedAnomalies,
      [id]: !prevSelectedAnomalies[id],
    }));

    setNouveauTicket((prevNouveauTicket) => {
      const updatedAnomalies = prevNouveauTicket.anomalies.includes(id)
        ? prevNouveauTicket.anomalies.filter((anomalieId) => anomalieId !== id)
        : [...prevNouveauTicket.anomalies, id];

      return {
        ...prevNouveauTicket,
        anomalies: updatedAnomalies,
      };
    });

    setFormErrors((prevErrors) => ({
      ...prevErrors,
      anomalies: null,
    }));
  };

  const validateForm = () => {
    const errors = {
      vehicule: null,
      anomalies: null,
      gravite: null,
      poste: null,
      utilisateur_assigne: null,
    };

    if (!nouveauTicket.vehicule) errors.vehicule = "Veuillez sélectionner un véhicule";
    if (!nouveauTicket.gravite) errors.gravite = "Veuillez sélectionner une gravité";
    if (!nouveauTicket.poste) errors.poste = "Veuillez indiquer le poste";
    if (nouveauTicket.anomalies.length === 0 && !nouveauTicket.anomalies_personnalisees) {
      errors.anomalies = "Veuillez sélectionner au moins une anomalie ou décrire une anomalie personnalisée";
    }

    // Check if a user is assigned - this is now required
    if (!nouveauTicket.utilisateur_assigne) {
      errors.utilisateur_assigne = "Veuillez assigner un utilisateur";
    }

    setFormErrors(errors);
    return Object.values(errors).every((error) => error === null);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      // Find vehicle by registration number
      const selectedVehicule = vehicules.find((v) => v.modele === nouveauTicket.vehicule);
      if (!selectedVehicule) {
        showAlert("Véhicule sélectionné invalide", "error");
        setLoading(false);
        return;
      }

      const ticketDataToSend = {
        ...nouveauTicket,
        vehicule: selectedVehicule.id, // Send vehicle ID to API
        statut: "EN_COURS", // Auto-set status to EN_COURS when a user is assigned
      };

      await api.post("/api/tickets/", ticketDataToSend);
      resetForm();
      handleCloseDialog();

      // Refresh ticket list and filter out 'CLOTURE' tickets
      const updatedTicketsResponse = await api.get("/api/tickets/suivre/");
      if (Array.isArray(updatedTicketsResponse.data)) {
        const activeTickets = updatedTicketsResponse.data.filter(
          (ticket) => ticket.statut !== "CLOTURE"
        );
        setTickets(activeTickets);
      }

      showAlert("Ticket créé avec succès", "success");
    } catch (error) {
      console.error("Erreur lors de la création du ticket:", error);
      showAlert("Erreur lors de la création du ticket", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNouveauTicket({
      vehicule: "",
      utilisateur_assigne: "",
      anomalies: [],
      anomalies_personnalisees: "",
      gravite: "MOYENNE",
      description: "",
      poste: "",
    });

    const resetSelectedAnomalies = {};
    pannes.forEach((panne) => {
      resetSelectedAnomalies[panne.id] = false;
    });

    setSelectedAnomalies(resetSelectedAnomalies);
    setFormErrors({
      vehicule: null,
      anomalies: null,
      gravite: null,
      poste: null,
      utilisateur_assigne: null,
    });
  };

  const showAlert = (message, severity) => {
    setAlert({ open: true, message, severity });
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const ticketsResponse = await api.get("/api/tickets/suivre/");
      if (Array.isArray(ticketsResponse.data)) {
        // Filter out 'CLOTURE' tickets during refresh
        const activeTickets = ticketsResponse.data.filter(
          (ticket) => ticket.statut !== "CLOTURE"
        );
        setTickets(activeTickets);
      } else {
        console.error("Unexpected tickets data format:", ticketsResponse.data);
        setTickets([]);
        showAlert("Error refreshing tickets", "error");
      }
    } catch (error) {
      console.error("Error refreshing tickets:", error);
      showAlert("Error refreshing tickets", "error");
    } finally {
      setLoading(false);
    }
  };

  // Find assigned user username by ID
  const getAssignedUserName = (userId) => {
    if (!userId) return "Non assigné"

    // Check if userId is an object (if the backend sends the full user object)
    if (typeof userId === "object" && userId !== null) {
      userId = userId.id || userId
    }

    // Explicit conversion to string to ensure correct comparison
    const userIdStr = String(userId)

    const user = maintenanceUsers.find((user) => String(user.id) === userIdStr)
    return user ? `${user.first_name} ${user.last_name}` : "Non assigné"
  }

  // Handler to change ticket status
  const handleStatusChange = async (ticketId, newStatus) => {
    setLoading(true);
    try {
      // Use the specific endpoint to change status
      await api.put(`/api/tickets/${ticketId}/changer_statut/`, {
        statut: newStatus,
      });
      const ticketsResponse = await api.get("/api/tickets/suivre/");
      if (Array.isArray(ticketsResponse.data)) {
        // Re-filter tickets after status change
        const activeTickets = ticketsResponse.data.filter(
          (ticket) => ticket.statut !== "CLOTURE"
        );
        setTickets(activeTickets);
      }
      showAlert("Statut mis à jour avec succès", "success");
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      showAlert("Erreur lors de la mise à jour du statut", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Get vehicle info by ID
  const getVehicleInfo = (vehicleId) => {
    if (typeof vehicleId === "object") {
      vehicleId = vehicleId.id || vehicleId;
    }

    const vehicle = vehicules.find((v) => v.id === vehicleId);
    return vehicle ? `${vehicle.modele} (${vehicle.type_vehicule})` : `ID: ${vehicleId}`;
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: "#ffffff", minHeight: "100vh", p: 3 }}>
        <Box
          sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main" }}>
              Gestion des anomalies Camions
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Suivez et créez les anomalies des Camions
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
            sx={{ borderRadius: "8px" }}
          >
            Rafraîchir
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Tickets
            </Typography>

            <Grid container spacing={3}>
              {tickets.map((ticket) => {
                const vehicleInfo = getVehicleInfo(ticket.vehicule);
                return (
                  <
                    // @ts-ignore
                    Grid
                    item
                    xs={12}
                    sm={6}
                    md={4}
                    key={ticket.id}
                  >
                    <Card
                      elevation={3}
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderTop: "4px solid",
                        borderColor: (theme) => {
                          const color = getSeverityColor(ticket.gravite);
                          return theme.palette[color]?.main || theme.palette.primary.main;
                        },
                        borderRadius: "8px",
                        transition: "transform 0.2s",
                        "&:hover": {
                          transform: "translateY(-4px)",
                          boxShadow: 6,
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                          <Typography variant="h6" component="div" sx={{ fontWeight: "bold" }}>
                            Ticket
                          </Typography>
                          <Chip
                            label={getStatusLabel(ticket.statut)}
                            color={getStatusColor(ticket.statut)}
                            size="small"
                          />
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <WarningIcon
                            sx={{
                              mr: 1,
                              color: (theme) => {
                                const color = getSeverityColor(ticket.gravite);
                                return theme.palette[color]?.main || theme.palette.primary.main;
                              },
                            }}
                          />
                          <Typography variant="body2">
                            <strong>Gravité:</strong> {getSeverityLabel(ticket.gravite)}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <InfoIcon sx={{ mr: 1, color: "#A7001E" }} />
                          <Typography variant="body2" noWrap title={vehicleInfo}>
                            <strong>Engin:</strong> {vehicleInfo}
                          </Typography>
                        </Box>

                        {/* Displaying Anomalies - FIXED HYDRATION ERROR HERE */}
                        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
                          <WarningIcon sx={{ mr: 1, color: "#212E53" }} />
                          {/* Changed component from 'p' (default) to 'span' to avoid div-in-p error */}
                          <Typography variant="body2" component="span">
                            <strong>Anomalies:</strong>{" "}
                            {ticket.anomalies && ticket.anomalies.length > 0 ? (
                              ticket.anomalies.map((anomalie) => (
                                <Chip
                                  key={anomalie.id}
                                  label={anomalie.nom}
                                  size="small"
                                  sx={{ mr: 0.5, mb: 0.5, bgcolor: "#E0E0E0" }}
                                />
                              ))
                            ) : (
                              "Aucune anomalie spécifiée"
                            )}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
                          <WarningAmberIcon sx={{ mr: 1, color: "#E1A624" }} />
                          <Typography variant="body2" component="span">
                            <strong>Autre:</strong>{" "}
                            {ticket.anomalies_personnalisees ? (
                              `${ticket.anomalies_personnalisees}`
                            ) : (
                              "Aucune anomalie personnalisée spécifiée"
                            )}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
                          <DescriptionIcon sx={{ mr: 1, color: "#6A645A" }} />
                          <Typography variant="body2" component="span">
                            <strong>Description:</strong>{" "}
                            {ticket.description ? (
                              `${ticket.description}`
                            ) : (
                              "Aucune description personnalisée spécifiée"
                            )}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <PersonIcon sx={{ mr: 1, color: "#4A919E" }} />
                          <Typography variant="body2">
                            <strong>Assigné à:</strong>{" "}
                            {ticket.utilisateur_assigne
                              ? getAssignedUserName(ticket.utilisateur_assigne)
                              : "Non assigné"}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <ScheduleIcon sx={{ mr: 1, color: "#7AA95C" }} /> {/* ScheduleIcon used here */}
                          <Typography variant="body2">
                            <strong>Poste:</strong> {ticket.poste}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <CalendarIcon sx={{ mr: 1, color: "#212E53" }} />
                          <Typography variant="body2">
                            <strong>Créé le:</strong> {formatDate(ticket.heure_creation)}
                          </Typography>
                        </Box>
                      </CardContent>

                      <Divider />

                      <CardActions>
                        <FormControl variant="outlined" size="small" sx={{ minWidth: 120, ml: "auto" }}>
                          <Select
                            value=""
                            displayEmpty
                            onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                            renderValue={() => "Changer statut"}
                            sx={{ borderRadius: "8px" }}
                          >
                            <MenuItem value="NOUVEAU">Nouveau</MenuItem>
                            <MenuItem value="EN_COURS">En Cours</MenuItem>
                            <MenuItem value="RESOLU">Résolu</MenuItem>
                            <MenuItem value="CLOTURE">Clôturé</MenuItem>
                          </Select>
                        </FormControl>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* Floating Action Button for creating a new ticket */}
        <Fab
          color="primary"
          aria-label="add"
          onClick={handleOpenDialog}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
            "&:hover": {
              transform: "scale(1.05)",
            },
            transition: "transform 0.2s",
          }}
        >
          <AddIcon />
        </Fab>

        {/* Full-screen dialog for creating a new ticket */}
        <Dialog fullScreen open={openDialog} onClose={handleCloseDialog}
          // @ts-ignore
          TransitionComponent={Transition}
        >
          <AppBar sx={{ position: "relative" }}>
            <Toolbar>
              <IconButton edge="start" color="inherit" onClick={handleCloseDialog} aria-label="close">
                <CloseIcon />
              </IconButton>
              <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                Création d'un Nouveau Ticket
              </Typography>
              <Button autoFocus color="inherit" onClick={handleSubmit} disabled={loading}>
                Créer
                {loading && <CircularProgress size={24} sx={{ ml: 1, color: "white" }} />}
              </Button>
            </Toolbar>
          </AppBar>

          <DialogContent>
            <Container maxWidth="md" sx={{ py: 4 }}>
              <Grid container spacing={3}>
                {/* Vehicule Select - Set to xs={12} for vertical layout */}
                <
                  // @ts-ignore
                  Grid item xs={12}>
                  <FormControl fullWidth error={!!formErrors.vehicule}>
                    <InputLabel id="vehicule-label">Engin</InputLabel>
                    <Select
                      labelId="vehicule-label"
                      id="vehicule"
                      name="vehicule"
                      value={nouveauTicket.vehicule}
                      onChange={handleVehiculeChange}
                      label="Véhicule"
                      sx={{ borderRadius: "8px" }}
                    >
                      <MenuItem value="">
                        <em>Aucun</em>
                      </MenuItem>
                      {vehicules.map((vehicule) => (
                        <MenuItem key={vehicule.id} value={vehicule.modele}>
                          {vehicule.modele} ({vehicule.type_vehicule})
                        </MenuItem>
                      ))}
                    </Select>
                    {formErrors.vehicule && <FormHelperText>{formErrors.vehicule}</FormHelperText>}
                  </FormControl>
                </Grid>

                {/* Assign User Select - Set to xs={12} for vertical layout */}
                <
                  // @ts-ignore
                  Grid item xs={12}>
                  <FormControl fullWidth error={!!formErrors.utilisateur_assigne}>
                    <InputLabel id="utilisateur_assigne-label">Assigner à (obligatoire)</InputLabel>
                    <Select
                      labelId="utilisateur_assigne-label"
                      id="utilisateur_assigne"
                      name="utilisateur_assigne"
                      value={nouveauTicket.utilisateur_assigne}
                      onChange={handleInputChange}
                      label="Assigner à (obligatoire)"
                      sx={{ borderRadius: "8px" }}
                    >
                      <MenuItem value="">
                        <em>Aucun</em>
                      </MenuItem>
                      {maintenanceUsers.map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name}
                        </MenuItem>
                      ))}
                    </Select>
                    {formErrors.utilisateur_assigne && (
                      <FormHelperText>{formErrors.utilisateur_assigne}</FormHelperText>
                    )}
                  </FormControl>
                </Grid>

                {/* Gravite Select - Set to xs={12} for vertical layout */}
                <
                  // @ts-ignore
                  Grid item xs={12}>
                  <FormControl fullWidth error={!!formErrors.gravite}>
                    <InputLabel id="gravite-label">Gravité</InputLabel>
                    <Select
                      labelId="gravite-label"
                      id="gravite"
                      name="gravite"
                      value={nouveauTicket.gravite}
                      onChange={handleInputChange}
                      label="Gravité"
                      sx={{ borderRadius: "8px" }}
                    >
                      <MenuItem value="LEGERE">Légère</MenuItem>
                      <MenuItem value="MOYENNE">Moyenne</MenuItem>
                      <MenuItem value="GRAVE">Grave</MenuItem>
                      <MenuItem value="CRITIQUE">Critique</MenuItem>
                    </Select>
                    {formErrors.gravite && <FormHelperText>{formErrors.gravite}</FormHelperText>}
                  </FormControl>
                </Grid>

                {/* Poste TextField - Set to xs={12} for vertical layout */}
                <
                  // @ts-ignore
                  Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Poste"
                    name="poste"
                    value={nouveauTicket.poste}
                    onChange={handleInputChange}
                    error={!!formErrors.poste}
                    helperText={formErrors.poste}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                  />
                </Grid>

                {/* Anomalies Section - inner grid remains for checkboxes, but the section itself takes full width */}
                <
                  // @ts-ignore
                  Grid item xs={12}>
                  <Paper sx={{ p: 3, borderRadius: "8px" }}>
                    <Typography variant="h6" gutterBottom>
                      Anomalies
                    </Typography>
                    <FormControl component="fieldset" error={!!formErrors.anomalies} sx={{ width: "100%" }}>
                      <Grid container spacing={2}>
                        {pannes.map((panne) => (
                          <
                            // @ts-ignore
                            Grid
                            item
                            xs={12} // Ensures each checkbox is on its own line if desired
                            sm={6} // Or keeps them side-by-side on larger screens if desired for the checkboxes
                            md={4}
                            key={panne.id}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={selectedAnomalies[panne.id] || false}
                                  onChange={() => handleAnomalieCheckboxChange(panne.id)}
                                  name={`anomalie-${panne.id}`}
                                  color="primary"
                                />
                              }
                              label={panne.nom}
                              sx={{
                                display: "flex",
                                p: 1,
                                borderRadius: "8px",
                                bgcolor: selectedAnomalies[panne.id] ? "rgba(25, 118, 210, 0.08)" : "transparent",
                                "&:hover": {
                                  bgcolor: "rgba(25, 118, 210, 0.04)",
                                },
                              }}
                            />
                          </Grid>
                        ))}
                      </Grid>
                      {formErrors.anomalies && nouveauTicket.anomalies.length === 0 && (
                        <FormHelperText sx={{ mt: 2 }}>{formErrors.anomalies}</FormHelperText>
                      )}
                    </FormControl>
                  </Paper>
                </Grid>

                {/* Autres anomalies TextField - Set to xs={12} for vertical layout */}
                <
                  // @ts-ignore
                  Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Autres anomalies (description)"
                    name="anomalies_personnalisees"
                    multiline
                    rows={2}
                    value={nouveauTicket.anomalies_personnalisees}
                    onChange={handleInputChange}
                    error={formErrors.anomalies && nouveauTicket.anomalies.length === 0 && !nouveauTicket.anomalies_personnalisees}
                    helperText={
                      formErrors.anomalies && nouveauTicket.anomalies.length === 0 && !nouveauTicket.anomalies_personnalisees
                        ? formErrors.anomalies
                        : ""
                    }
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                  />
                </Grid>

                {/* Description TextField - Set to xs={12} for vertical layout */}
                <
                  // @ts-ignore
                  Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description (Optionnel)"
                    name="description"
                    multiline
                    rows={3}
                    value={nouveauTicket.description}
                    onChange={handleInputChange}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
                  />
                </Grid>
              </Grid>
            </Container>
          </DialogContent>
        </Dialog>

        <Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert}>
          <Alert
            onClose={handleCloseAlert}
            // @ts-ignore
            severity={alert.severity}
            sx={{ width: "100%" }}
          >
            {alert.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default PermanencierCamionTicket;