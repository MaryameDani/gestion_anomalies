"use client"

import { useState, useEffect } from "react"
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  IconButton,
  Box,
  Chip,
} from "@mui/material"
import { Edit as EditIcon, Save as SaveIcon } from "@mui/icons-material"
import axios from "axios"

// Configuration axios
const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
})

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken")
    }
    return Promise.reject(error)
  },
)

function PermanencierCamionGestionTicket() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingTicketId, setEditingTicketId] = useState(null)
  const [editedHours, setEditedHours] = useState({
    id: null,
    heure_creation: "",
    heure_cloture: "",
  })

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem("accessToken")
      if (!token) {
        setError("Authentification requise. Veuillez vous connecter.")
        setLoading(false)
        return
      }

      const response = await api.get("/api/tableau-arrets/")

      if (Array.isArray(response.data)) {
        const validTickets = response.data.filter(
          (ticket) => ticket.id !== null && ticket.id !== undefined && typeof ticket.id === "number",
        )

        const invalidTicketsCount = response.data.length - validTickets.length
        if (invalidTicketsCount > 0) {
          console.warn(
            `${invalidTicketsCount} tickets ont été ignorés car leur ID est manquant ou invalide du backend.`,
          )
          setError(
            `Attention : ${invalidTicketsCount} tickets n'ont pas pu être chargés car leur ID est manquant ou invalide.`,
          )
        }

        setTickets(validTickets)
      } else {
        console.error("La réponse de l'API n'est pas un tableau:", response.data)
        setError("Format de données inattendu reçu du serveur.")
        setTickets([])
      }
      setLoading(false)
    } catch (err) {
      setLoading(false)
      console.error("Erreur lors du chargement des tickets:", err)

      let errorMessage = "Erreur lors du chargement des tickets. Veuillez réessayer."
      if (err.response?.status === 401) {
        errorMessage = "Session expirée ou authentification invalide. Veuillez vous reconnecter."
      } else if (err.response?.status === 403) {
        errorMessage = "Accès non autorisé pour votre rôle. Vérifiez vos permissions."
      } else if (err.code === "NETWORK_ERROR") {
        errorMessage = "Impossible de se connecter au serveur. Vérifiez votre connexion."
      }
      setError(errorMessage)
    }
  }

  const formatDateForInput = (dateString) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, "0")
      const day = date.getDate().toString().padStart(2, "0")
      const hours = date.getHours().toString().padStart(2, "0")
      const minutes = date.getMinutes().toString().padStart(2, "0")
      return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch (error) {
      console.error("Error formatting date for input:", dateString, error)
      return ""
    }
  }

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (e) {
      console.error("Invalid date string for display:", dateString, e)
      return "Date invalide"
    }
  }

  const getStopTypeColor = (type) => {
    const colors = {
      Maintenance: "#8FBC8F",
      Panne: "#CD853F",
      Révision: "#9ACD32",
      Contrôle: "#6B8E23",
    }
    return colors[type] || "#D2B48C"
  }

  const handleEditClick = (ticket) => {
    if (typeof ticket.id !== "number") {
      setError("Ce ticket ne peut pas être modifié car il n'a pas d'ID valide du serveur.")
      return
    }
    setEditingTicketId(ticket.id)
    setEditedHours({
      id: ticket.id,
      heure_creation: formatDateForInput(ticket.heure_creation),
      heure_cloture: formatDateForInput(ticket.heure_cloture),
    })
  }

  const handleSaveClick = async () => {
    const currentTicket = tickets.find((ticket) => ticket.id === editingTicketId)

    if (!currentTicket || typeof currentTicket.id !== "number") {
      setError("Impossible de sauvegarder : ID de ticket manquant ou invalide.")
      setEditingTicketId(null)
      return
    }

    try {
      const token = localStorage.getItem("accessToken")
      if (!token) {
        setError("Authentification requise pour modifier.")
        return
      }

      let creationTimeForBackend = null
      if (editedHours.heure_creation) {
        creationTimeForBackend = `${editedHours.heure_creation}:00Z`
      }

      let closureTimeForBackend = null
      if (editedHours.heure_cloture) {
        closureTimeForBackend = `${editedHours.heure_cloture}:00Z`
      }

      const payload = {
        heure_creation: creationTimeForBackend,
        heure_cloture: closureTimeForBackend,
      }

      await api.patch(`/api/ticket/${currentTicket.id}/modifier-heures/`, payload)

      setEditingTicketId(null)
      setEditedHours({ id: null, heure_creation: "", heure_cloture: "" })
      fetchTickets()
      setError(null)
    } catch (err) {
      console.error("Error modifying ticket hours:", err)
      let errorMessage = "Erreur lors de la modification. Veuillez réessayer."
      if (err.response?.status === 401) {
        errorMessage = "Session expirée ou authentification invalide lors de la modification."
      } else if (err.response?.status === 403) {
        errorMessage = "Vous n'êtes pas autorisé à modifier ce ticket."
      } else if (err.response?.status === 404) {
        errorMessage = "Ticket non trouvé. Il a peut-être été supprimé ou l'ID est incorrect."
      }
      setError(errorMessage)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setEditedHours((prevHours) => ({
      ...prevHours,
      [name]: value,
    }))
  }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ textAlign: "center", mt: 6 }}>
        <CircularProgress sx={{ color: "#6B8E23" }} />
        <Typography variant="h6" sx={{ mt: 2, color: "#8B7355" }}>
          Chargement des données...
        </Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, backgroundColor: "#FEFEFE" }}>
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: "500",
            color: "#6B8E23",
            mb: 1,
          }}
        >
          Gestion des Tickets Camion
        </Typography>
        <Typography variant="subtitle1" sx={{ color: "#8B7355" }}>
          Gérez et modifiez les tickets d'arrêt des Camions
        </Typography>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            backgroundColor: "#F5DEB3",
            color: "#8B4513",
            border: "1px solid #DEB887",
          }}
        >
          {error}
        </Alert>
      )}

      {tickets.length === 0 && !error ? (
        <Paper sx={{ textAlign: "center", py: 4, backgroundColor: "#F5F5DC" }}>
          <Typography variant="h6" sx={{ color: "#8B7355", mb: 1 }}>
            Aucun ticket disponible
          </Typography>
          <Typography variant="body2" sx={{ color: "#A0A0A0" }}>
            Aucun ticket d'arrêt Camion n'est disponible pour votre rôle.
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            backgroundColor: "#FAFAFA",
            border: "1px solid #E0E0E0",
          }}
        >
          <Table aria-label="table des tickets d'arrêt Camion">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#6B8E23" }}>
                <TableCell sx={{ color: "white", fontWeight: "600" }}>Modèle Véhicule</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "600" }}>Type d'Arrêt</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "600" }}>Heure de Création</TableCell>
                <TableCell sx={{ color: "white", fontWeight: "600" }}>Heure de Clôture</TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: "600" }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.map((ticket, index) => (
                <TableRow
                  key={ticket.id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? "#F5F5DC" : "white",
                    "&:hover": {
                      backgroundColor: "#F0F8E8",
                    },
                  }}
                >
                  <TableCell sx={{ color: "#2F4F2F" }}>{ticket.vehicule_modele}</TableCell>
                  <TableCell>
                    <Chip
                      label={ticket.type_arret}
                      sx={{
                        backgroundColor: getStopTypeColor(ticket.type_arret),
                        color: "white",
                        fontWeight: "500",
                      }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {editingTicketId === ticket.id ? (
                      <TextField
                        name="heure_creation"
                        type="datetime-local"
                        value={editedHours.heure_creation}
                        onChange={handleChange}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "white",
                          },
                        }}
                      />
                    ) : (
                      <Typography variant="body2" sx={{ color: "#2F4F2F" }}>
                        {formatDateForDisplay(ticket.heure_creation)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingTicketId === ticket.id ? (
                      <TextField
                        name="heure_cloture"
                        type="datetime-local"
                        value={editedHours.heure_cloture}
                        onChange={handleChange}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: "white",
                          },
                        }}
                      />
                    ) : (
                      <Typography variant="body2" sx={{ color: "#2F4F2F" }}>
                        {formatDateForDisplay(ticket.heure_cloture)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {editingTicketId === ticket.id ? (
                      <IconButton
                        aria-label="sauvegarder"
                        onClick={handleSaveClick}
                        disabled={typeof ticket.id !== "number"}
                        sx={{
                          color: "#6B8E23",
                          backgroundColor: "#F0F8E8",
                          "&:hover": {
                            backgroundColor: "#E8F5E8",
                          },
                        }}
                      >
                        <SaveIcon />
                      </IconButton>
                    ) : (
                      <IconButton
                        aria-label="modifier"
                        onClick={() => handleEditClick(ticket)}
                        disabled={typeof ticket.id !== "number"}
                        sx={{
                          color: "#8B7355",
                          backgroundColor: "#F5F5DC",
                          "&:hover": {
                            backgroundColor: "#F0F0DC",
                          },
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  )
}

export default PermanencierCamionGestionTicket