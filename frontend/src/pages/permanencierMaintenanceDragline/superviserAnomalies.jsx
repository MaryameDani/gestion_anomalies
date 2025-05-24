"use client"

import React, { useState, useEffect } from "react"
import axios from "axios"
import {
  Box,
  Typography,
  Paper,
  Button,
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
  Card,
  CardContent,
  CardActions,
  Divider,
} from "@mui/material"
import {
  Refresh as RefreshIcon,
  Info as InfoIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Description as DescriptionIcon,
  Schedule as ScheduleIcon, 
  WarningAmber as WarningAmberIcon,
} from "@mui/icons-material"

// Custom theme with green primary color
import { createTheme, ThemeProvider } from "@mui/material/styles"

const theme = createTheme({
  palette: {
    primary: {
      main: "#B7CE66", // Green
    },
  },
})

// Configure Axios with base URL
const api = axios.create({
  baseURL: "http://localhost:8000",
})

// Configure Axios with JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken")
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

const MaintenanceDraglineSuperviser = () => {
  const [tickets, setTickets] = useState([])
  const [vehicules, setVehicules] = useState([])
  const [pannes, setPannes] = useState([]) // Still fetched but not used for creation
  const [maintenanceUsers, setMaintenanceUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState({ open: false, message: "", severity: "success" })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [ticketsResponse, vehiculesResponse, pannesResponse, maintenanceUsersResponse] = await Promise.all([
          api.get("/api/tickets/suivre/"),
          api.get("/api/vehicules/"),
          api.get("/api/pannes/"),
          api.get("/api/utilisateurs-par-type/?user_type=MAINTENANCIER"),
        ])

        // Handle tickets data
        if (Array.isArray(ticketsResponse.data)) {
          setTickets(ticketsResponse.data)
        } else {
          console.error("Unexpected tickets data format:", ticketsResponse.data)
          setTickets([])
          showAlert("Error loading tickets", "error")
        }

        // Handle vehicles data
        if (Array.isArray(vehiculesResponse.data)) {
          setVehicules(vehiculesResponse.data)
        } else {
          console.error("Unexpected vehicles data format:", vehiculesResponse.data)
          setVehicules([])
        }

        // Handle breakdowns data (still fetching, but not for form population)
        if (Array.isArray(pannesResponse.data)) {
          setPannes(pannesResponse.data)
        } else {
          console.error("Unexpected breakdowns data format:", pannesResponse.data)
          setPannes([])
        }

        // Handle maintenance users data
        if (
          maintenanceUsersResponse.data &&
          maintenanceUsersResponse.data.success &&
          Array.isArray(maintenanceUsersResponse.data.utilisateurs)
        ) {
          setMaintenanceUsers(maintenanceUsersResponse.data.utilisateurs)
        } else {
          console.error("Unexpected maintenance users data format:", maintenanceUsersResponse.data)
          setMaintenanceUsers([])
        }
      } catch (error) {
        console.error("Error retrieving data:", error)
        showAlert("Error loading data", "error")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleString("fr-FR")
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "NOUVEAU":
        return "primary"
      case "EN_COURS":
        return "warning"
      case "RESOLU":
        return "success"
      case "CLOTURE":
        return "default"
      default:
        return "default"
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case "NOUVEAU":
        return "NOUVEAU"
      case "EN_COURS":
        return "EN COURS"
      case "RESOLU":
        return "RESOLU"
      case "CLOTURE":
        return "CLOTURE"
      default:
        return status
    }
  }

  const getSeverityLabel = (severity) => {
    switch (severity) {
      case "CRITIQUE":
        return "CRITIQUE"
      case "MOYENNE":
        return "MOYENNE"
      case "GRAVE":
        return "GRAVE"
      case "LEGERE":
        return "LEGERE"
      default:
        return severity
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "CRITIQUE":
        return "error"
      case "GRAVE":
        return "error"
      case "MOYENNE":
        return "warning"
      case "LEGERE":
        return "info"
      default:
        return "default"
    }
  }

  const showAlert = (message, severity) => {
    setAlert({ open: true, message, severity })
  }

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false })
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const ticketsResponse = await api.get("/api/tickets/suivre/")
      if (Array.isArray(ticketsResponse.data)) {
        setTickets(ticketsResponse.data)
      } else {
        console.error("Unexpected tickets data format:", ticketsResponse.data)
        setTickets([])
        showAlert("Error refreshing tickets", "error")
      }
    } catch (error) {
      console.error("Error refreshing tickets:", error)
      showAlert("Error refreshing tickets", "error")
    } finally {
      setLoading(false)
    }
  }

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

  // Get vehicle info by ID
  const getVehicleInfo = (vehicleId) => {
    if (typeof vehicleId === "object" && vehicleId !== null) {
      vehicleId = vehicleId.id || vehicleId
    }

    const vehicle = vehicules.find((v) => v.id === vehicleId)
    return vehicle ? `${vehicle.modele} (${vehicle.type_vehicule})` : `ID: ${vehicleId}`
  }

  // Handler to assign a user to a ticket
  const handleAssignUser = async (ticketId, userId) => {
    setLoading(true)
    try {
      await api.put(`/api/tickets/${ticketId}/assigner_maintenance/`, {
        utilisateur_assigne_maintenance: userId,
        // You might want to update the status here as well, e.g., to "EN_COURS"
        // statut: "EN_COURS",
      })
      const ticketsResponse = await api.get("/api/tickets/suivre/")
      if (Array.isArray(ticketsResponse.data)) {
        setTickets(ticketsResponse.data)
      }
      showAlert("Utilisateur assigné avec succès", "success")
    } catch (error) {
      console.error("Erreur lors de l'assignation de l'utilisateur:", error)
      showAlert("Erreur lors de l'assignation de l'utilisateur", "error")
    } finally {
      setLoading(false)
    }
  }

  // Handler to change ticket status
  const handleStatusChange = async (ticketId, newStatus) => {
    setLoading(true)
    try {
      await api.put(`/api/tickets/${ticketId}/changer_statut/`, { statut: newStatus })
      const ticketsResponse = await api.get("/api/tickets/suivre/")
      if (Array.isArray(ticketsResponse.data)) {
        setTickets(ticketsResponse.data)
      }
      showAlert("Statut mis à jour avec succès", "success")
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error)
      showAlert("Erreur lors de la mise à jour du statut", "error")
    } finally {
      setLoading(false)
    }
  }

  // Filter out tickets with status 'CLOTURE' before rendering
  const visibleTickets = tickets.filter(ticket => ticket.statut !== 'CLOTURE');

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ bgcolor: "#ffffff", minHeight: "100vh", p: 3 }}>
        <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "primary.main" }}>
              Gestion des Tickets Machines
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Suivez les anomalies des Machines
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
              {visibleTickets.map((ticket) => { // Use visibleTickets here
                const vehicleInfo = getVehicleInfo(ticket.vehicule)
                return (
                  <
                    // @ts-ignore
                    Grid item xs={12} sm={6} md={4} key={ticket.id}>
                    <Card
                      elevation={3}
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderTop: "4px solid",
                        borderColor: (theme) => {
                          const color = getSeverityColor(ticket.gravite)
                          return theme.palette[color]?.main || theme.palette.primary.main
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
                                const color = getSeverityColor(ticket.gravite)
                                return theme.palette[color]?.main || theme.palette.primary.main
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
                            <strong>Dragline:</strong> {vehicleInfo}
                          </Typography>
                        </Box>

                        {/* Displaying Anomalies */}
                        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
                          <WarningIcon sx={{ mr: 1, color: "#212E53" }} />
                          <Typography variant="body2">
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
                            {ticket.utilisateur_assigne_maintenance
                              ? getAssignedUserName(ticket.utilisateur_assigne_maintenance)
                              : "Non assigné"}
                          </Typography>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <ScheduleIcon sx={{ mr: 1, color: "#7AA95C" }} />
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

                      <CardActions sx={{ display: 'flex', justifyContent: 'space-between', p: 2 }}>
                        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                          <InputLabel id={`assign-label-${ticket.id}`}>Assigner à</InputLabel>
                          <Select
                            labelId={`assign-label-${ticket.id}`}
                            value={ticket.utilisateur_assigne_maintenance ? (typeof ticket.utilisateur_assigne_maintenance === 'object' ? ticket.utilisateur_assigne_maintenance.id : ticket.utilisateur_assigne_maintenance) : ""}
                            onChange={(e) => handleAssignUser(ticket.id, e.target.value)}
                            label="Assigner à"
                            sx={{ borderRadius: "8px" }}
                          >
                            <MenuItem value="">
                              <em>Non assigné</em>
                            </MenuItem>
                            {maintenanceUsers.map((user) => (
                              <MenuItem key={user.id} value={user.id}>
                                {user.last_name} {user.first_name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                          <InputLabel id={`status-label-${ticket.id}`}>Changer statut</InputLabel>
                          <Select
                            labelId={`status-label-${ticket.id}`}
                            value={ticket.statut}
                            onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                            label="Changer statut"
                            sx={{ borderRadius: "8px" }}
                          >
                            <MenuItem value="RESOLU">Résolu</MenuItem>
                          </Select>
                        </FormControl>
                      </CardActions>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Box>
        )}

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
  )
}

export default MaintenanceDraglineSuperviser