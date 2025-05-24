"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
  Stack,
  Tab,
  Tabs,
  Card,
  CardContent,
  Chip,
} from "@mui/material"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import {
  Dashboard as DashboardIcon,
  DirectionsCar as CarIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material"

// Thème vert/beige
const theme = createTheme({
  palette: {
    primary: {
      main: "#6B8E23", // Vert olive
    },
    secondary: {
      main: "#8B7355", // Beige foncé
    },
    background: {
      default: "#FEFEFE",
      paper: "#F5F5DC",
    },
  },
})

// Couleurs pour les graphiques
const COLORS = {
  TRAVAIL: "#679436", // Vert olive
  ARRET_DETERMINE: "#F3BB00", // Vert clair
  ARRET_NON_DETERMINE: "#A7001E", // Or
}

// Définition des postes
const POSTES = {
  1: { debut: 7, fin: 15, label: "Poste 1 (7h-15h)" },
  2: { debut: 15, fin: 23, label: "Poste 2 (15h-23h)" },
  3: { debut: 23, fin: 31, label: "Poste 3 (23h-7h)" }, // 31h pour représenter 7h le jour suivant
}

const api = axios.create({
  baseURL: "http://localhost:8000",
})

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

const PermanencierCamionFormulaireFin = () => {
  const [formData, setFormData] = useState({
    type_vehicule: "CAMION",
    first_name: "",
    last_name: "",
    phone: "",
    date_poste: formatDate(new Date()),
    heure_debut: "",
    heure_fin: "",
    heure_de_fin_du_compteur: "",
    commentaire: "",
    poste: "",
    modele: "",
  })

  const [postesDisponibles, setPostesDisponibles] = useState([])
  const [enregistrementStatus, setEnregistrementStatus] = useState(null)
  const [errorMessage, setErrorMessage] = useState("")

  const [activiteVehicules, setActiviteVehicules] = useState({})
  const [loadingActivite, setLoadingActivite] = useState(true)
  const [errorActivite, setErrorActivite] = useState("")

  const [selectedArretNonDetermine, setSelectedArretNonDetermine] = useState(null)

  const [pannesConues, setPannesConues] = useState([])
  const [selectedPannes, setSelectedPannes] = useState([])
  const [pannePersonnalisee, setPannePersonnalisee] = useState("")
  const [descriptionPanne, setDescriptionPanne] = useState("")
  const [submissionPanneStatus, setSubmissionPanneStatus] = useState(null)
  const [errorMessagePanne, setErrorMessagePanne] = useState("")

  const [vehiculesDisponibles, setVehiculesDisponibles] = useState([])
  const [loadingVehicules, setLoadingVehicules] = useState(true)
  const [errorVehicules, setErrorVehicules] = useState("")

  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState("Aucun message")
  const [snackbarSeverity, setSnackbarSeverity] = useState("success")

  const [isPanneFormOpen, setIsPanneFormOpen] = useState(false)
  const [panneHeureDebut, setPanneHeureDebut] = useState("")
  const [panneHeureFin, setPanneHeureFin] = useState("")

  const [timelineData, setTimelineData] = useState({})
  const [selectedPoste, setSelectedPoste] = useState("ALL")

  // New state for hovered chart key
  const [hoveredChartKey, setHoveredChartKey] = useState(null);

  // Fonction utilitaire pour valider et nettoyer les nombres
  const safeNumber = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === "") {
      return defaultValue
    }
    const num = Number(value)
    return isNaN(num) || !isFinite(num) ? defaultValue : num
  }

  // Fonction utilitaire pour arrondir de manière sécurisée
  const safeRound = (value, decimals = 2) => {
    const num = safeNumber(value, 0)
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
  }

  const showAlert = (message, severity) => {
    setSnackbarMessage(message)
    setSnackbarSeverity(severity)
    setSnackbarOpen(true)
  }

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return
    }
    setSnackbarOpen(false)
  }

  const fetchActivite = async () => {
    setLoadingActivite(true)
    try {
      const response = await api.get("/api/activite/vehicules/")
      console.log("Activite API Response:", response.data); // DEBUG LOG
      if (response.data && Array.isArray(response.data)) {
        const groupedActivite = {}
        response.data.forEach((item) => {
          groupedActivite[item.vehicule] = item
        })
        setActiviteVehicules(groupedActivite)
        prepareTimelineData(groupedActivite)
      } else {
        console.error("Format inattendu pour l'activité des véhicules:", response.data)
        setErrorActivite("Erreur lors du chargement de l'activité.")
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de l'activité des véhicules:", err)
      setErrorActivite("Erreur lors du chargement de l'activité.")
    } finally {
      setLoadingActivite(false)
    }
  }

  // Convertir une date ISO en heure décimale (0-24) avec validation
  const dateToHourDecimal = (dateStr) => {
    if (!dateStr) return 0
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return 0
      const hours = safeNumber(date.getHours(), 0)
      const minutes = safeNumber(date.getMinutes(), 0)
      return hours + minutes / 60
    } catch (error) {
      console.warn("Erreur lors de la conversion de date:", dateStr, error)
      return 0
    }
  }

  // Ajuster l'heure pour le graphique (pour gérer le poste de nuit qui chevauche deux jours)
  const adjustHourForChart = (hour) => {
    const safeHour = safeNumber(hour, 0)
    // Si l'heure est entre minuit (0h) et 7h, ajoute 24 pour la placer après 23h du jour précédent
    // Cela permet de visualiser le poste de nuit sur une échelle continue de 24h+
    return safeHour >= 0 && safeHour < 7 ? safeHour + 24 : safeHour
  }

  // Préparer les données pour le graphique timeline
  const prepareTimelineData = (activiteData) => {
    const newTimelineData = {} // Utiliser une nouvelle variable pour éviter les mutations directes

    Object.entries(activiteData).forEach(([vehicule, data]) => {
      const vehiculeInfo = vehiculesDisponibles.find((v) => v.modele === vehicule)
      if (vehiculeInfo && vehiculeInfo.type_vehicule?.toUpperCase() === "CAMION") {
        const activites = data.activites || []
        const timelineActivities = []

        activites.forEach((activite) => {
          const debutHeure = dateToHourDecimal(activite.heure_debut)
          const finHeure = dateToHourDecimal(activite.heure_fin)

          const debutAjuste = adjustHourForChart(debutHeure)
          let finAjuste = adjustHourForChart(finHeure)

          // Si l'activité commence un jour et finit le lendemain (ex: 23h -> 7h)
          // et que l'heure de fin ajustée est avant l'heure de début ajustée,
          // ajuster l'heure de fin en ajoutant 24 heures pour la continuité visuelle.
          if (finAjuste <= debutAjuste && (finHeure < 7 || finHeure > 23)) {
            finAjuste += 24
          }

          const duree = Math.max(0.01, safeNumber(finAjuste - debutAjuste, 0.01))

          const typeNormalise = normalizeString(activite.type || "")
          let typeActivite = "autre"

          if (typeNormalise === "travail") {
            typeActivite = "travail"
          } else if (typeNormalise.includes("arret_determine") || typeNormalise.includes("arret_déterminé")) {
            typeActivite = "arretDetermine"
          } else if (typeNormalise.includes("arret_non_determine") || typeNormalise.includes("arret_non_déterminé")) {
            typeActivite = "arretNonDetermine"
          }

          timelineActivities.push({
            debut: safeNumber(debutAjuste, 0),
            fin: safeNumber(finAjuste, 0),
            duree: safeNumber(duree, 0.01),
            type: typeActivite,
            poste: determinerPoste(debutAjuste),
            details: {
              heureDebut: new Date(activite.heure_debut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              heureFin: new Date(activite.heure_fin).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              conducteur: activite.conducteur || "Non spécifié",
              cause: activite.cause || "",
              vehiculeId: vehiculeInfo.id,
              activiteOriginal: activite,
            },
          })
        })
        console.log("Timeline Activities for", vehicule, timelineActivities); // DEBUG LOG
        newTimelineData[vehicule] = timelineActivities
      }
    })
    console.log("Final Timeline Data:", newTimelineData); // DEBUG LOG
    setTimelineData(newTimelineData)
  }

  // Déterminer le poste en fonction de l'heure
  const determinerPoste = (heure) => {
    const safeHeure = safeNumber(heure, 0)
    const heureAjustee = safeHeure > 24 ? safeHeure - 24 : safeHeure // Ramener l'heure dans le cycle 0-24 pour la détermination du poste

    if (heureAjustee >= 7 && heureAjustee < 15) {
      return 1
    } else if (heureAjustee >= 15 && heureAjustee < 23) {
      return 2
    } else {
      return 3
    }
  }

  // Gérer le changement d'onglet de poste
  const handlePosteChange = (event, newValue) => {
    setSelectedPoste(newValue)
  }

  useEffect(() => {
    setPostesDisponibles([1, 2, 3])

    const fetchVehicules = async () => {
      setLoadingVehicules(true)
      try {
        const response = await api.get("/api/vehicules/")
        if (Array.isArray(response.data)) {
          setVehiculesDisponibles(response.data.filter((v) => v.type_vehicule?.toUpperCase() === "CAMION"))
        } else {
          console.error("Format inattendu pour les véhicules:", response.data)
          setErrorVehicules("Erreur lors du chargement des véhicules.")
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des véhicules:", error)
        setErrorVehicules("Erreur lors du chargement des véhicules.")
        showAlert("Erreur lors du chargement des véhicules.", "error")
      } finally {
        setLoadingVehicules(false)
      }
    }
    fetchVehicules()

    fetchActivite()

    const fetchPannes = async () => {
      try {
        const response = await api.get("/api/pannes/")
        if (Array.isArray(response.data)) {
          setPannesConues(response.data)
        } else {
          console.error("Format inattendu pour les pannes:", response.data)
          setErrorMessagePanne("Erreur lors du chargement des pannes.")
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des pannes connues:", error)
        setErrorMessagePanne("Erreur lors du chargement des pannes.")
        showAlert("Erreur lors du chargement des pannes.", "error")
      }
    }
    fetchPannes()
  }, [])

  useEffect(() => {
    // Re-préparer les données de la timeline si les véhicules ou l'activité changent
    if (!loadingVehicules && !loadingActivite && Object.keys(activiteVehicules).length > 0) {
      prepareTimelineData(activiteVehicules)
    }
  }, [vehiculesDisponibles, activiteVehicules, loadingVehicules, loadingActivite])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }))
  }

  const handleSubmitFinPoste = async (e) => {
    e.preventDefault()
    setEnregistrementStatus("En cours...")
    setErrorMessage("")

    try {
      const response = await api.post("/api/fin-poste/", formData)
      setEnregistrementStatus("Succès: " + response.data.message)
      setFormData((prevState) => ({
        ...prevState,
        heure_debut: "",
        heure_fin: "",
        heure_de_fin_du_compteur: "",
        commentaire: "",
        poste: "",
        modele: "",
      }))
      fetchActivite()
      showAlert(response.data.message, "success")
    } catch (error) {
      console.error(
        "Erreur lors de l'enregistrement de la fin de poste:",
        error.response ? error.response.data : error.message,
      )
      setEnregistrementStatus("Erreur lors de l'enregistrement.")
      setErrorMessage(error.response?.data?.error || "Une erreur inconnue est survenue.")
      showAlert(error.response?.data?.error || "Une erreur inconnue est survenue.", "error")
    }
  }

  const handleArretNonDetermineClick = (activite) => {
    if (activite.type === "arretNonDetermine" && activite.details) {
      const arret = activite.details.activiteOriginal
      const vehiculeId = activite.details.vehiculeId

      setSelectedArretNonDetermine({ ...arret, vehicule_id: vehiculeId })
      setSelectedPannes([])
      setPannePersonnalisee("")
      setDescriptionPanne("")
      setSubmissionPanneStatus(null)
      setErrorMessagePanne("")
      setPanneHeureDebut(arret.heure_debut)
      setPanneHeureFin(arret.heure_fin)
      setIsPanneFormOpen(true)
    }
  }

  const handlePanneCheckboxChange = (event) => {
    const { value, checked } = event.target
    const panneId = Number.parseInt(value, 10)

    if (checked) {
      setSelectedPannes([...selectedPannes, panneId])
    } else {
      setSelectedPannes(selectedPannes.filter((id) => id !== panneId))
    }
  }

  const handlePannePersonnaliseeChange = (event) => {
    setPannePersonnalisee(event.target.value)
  }

  const handleDescriptionPanneChange = (event) => {
    setDescriptionPanne(event.target.value)
  }

  const handleSubmitPanne = async (event) => {
    event.preventDefault()
    setSubmissionPanneStatus("Envoi en cours...")
    setErrorMessagePanne("")

    if (!selectedArretNonDetermine) {
      setErrorMessagePanne("Aucun arrêt non déterminé sélectionné.")
      setSubmissionPanneStatus("Erreur")
      showAlert("Aucun arrêt non déterminé sélectionné.", "warning")
      return
    }

    const vehiculeId = selectedArretNonDetermine.vehicule_id

    if (!vehiculeId) {
      setErrorMessagePanne("ID du véhicule non trouvé pour l'arrêt sélectionné. Impossible de déclarer la panne.")
      setSubmissionPanneStatus("Erreur")
      showAlert("ID du véhicule non trouvé pour l'arrêt sélectionné. Impossible de déclarer la panne.", "warning")
      return
    }

    try {
      const response = await api.post("/api/formulaire/pannes/", {
        vehicule_id: vehiculeId,
        type_arret: "panne_formulaire",
        heure_debut: panneHeureDebut,
        heure_fin: panneHeureFin,
        description: descriptionPanne,
        pannes_ids: selectedPannes,
        panne_personnalisee: pannePersonnalisee,
      })
      setSubmissionPanneStatus("Succès: " + JSON.stringify(response.data))
      setSelectedArretNonDetermine(null)
      setPanneHeureDebut("")
      setPanneHeureFin("")
      fetchActivite()
      showAlert("Cause de l'arrêt enregistrée avec succès.", "success")
      setIsPanneFormOpen(false)
    } catch (error) {
      console.error(
        "Erreur lors de l'enregistrement de la panne:",
        error.response ? error.response.data : error.message,
      )
      setSubmissionPanneStatus("Erreur lors de l'enregistrement.")
      setErrorMessagePanne(error.response?.data?.detail || error.message || "Une erreur est survenue.")
      showAlert(error.response?.data?.detail || error.message || "Une erreur est survenue.", "error")
    }
  }

  const handleClosePanneForm = () => {
    setSelectedArretNonDetermine(null)
    setIsPanneFormOpen(false)
  }

  function formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const normalizeString = (str) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()

  const renderVehicleActivite = (modeleVehicule, vehicleData) => {
    const activites = vehicleData.activites
    const heuresTravaillees = vehicleData.heures_travaillees

    const travaux = activites.filter((a) => a.type === "travail")
    const arretsDeterminesFormulaire = activites.filter((a) => a.type === "arret_determiné_formulaire")
    const arretsDeterminesTicket = activites.filter((a) => a.type === "arret_determiné_formulaire_ouvert")

    const arretsNonDetermines = activites.filter(
      (act) => normalizeString(act.type || "") === normalizeString("arret_non_déterminé"),
    )

    const sortedArretsNonDetermines = [...arretsNonDetermines].sort(
      (a, b) => new Date(a.heure_debut).getTime() - new Date(b.heure_debut).getTime(),
    )

    const currentVehicule = vehiculesDisponibles.find((v) => v.modele === modeleVehicule)
    const currentVehiculeId = currentVehicule ? currentVehicule.id : null

    return (
      <Card
        key={modeleVehicule}
        sx={{
          mb: 3,
          backgroundColor: "#F5F5DC",
          border: "1px solid #E0E0E0",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <CarIcon sx={{ mr: 2, color: "#6B8E23", fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: "600", color: "#2F4F2F" }}>
              Engin: {modeleVehicule}
            </Typography>
          </Box>

          {heuresTravaillees && Object.keys(heuresTravaillees).length > 0 && (
            <Card sx={{ backgroundColor: "#E8F5E8", mb: 2, border: "1px solid #C8E6C9" }}>
              <CardContent sx={{ py: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <ScheduleIcon sx={{ mr: 1, color: "#6B8E23" }} />
                  <Typography variant="body2" sx={{ fontWeight: "600", color: "#2F4F2F" }}>
                    Heures travaillées:
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {Object.entries(heuresTravaillees).map(([poste, heures]) => (
                    <Chip
                      key={`${modeleVehicule}-heures-${poste}`}
                      label={`Poste ${poste}: ${heures}h`}
                      size="small"
                      sx={{ backgroundColor: "#6B8E23", color: "white" }}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {travaux.length > 0 && (
            <Card sx={{ backgroundColor: "#E8F5E8", mb: 2, border: "1px solid #C8E6C9" }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: "600", color: "#2F4F2F", mb: 1 }}>
                  ✅ Travaux:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2, color: "#2F4F2F" }}>
                  {travaux.map((travail, index) => (
                    <li key={`${modeleVehicule}-travail-${travail.heure_debut}-${index}`}>
                      <Typography variant="body2">
                        {new Date(travail.heure_debut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {new Date(travail.heure_fin).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                        (Poste: {travail.poste}, Conducteur: {travail.conducteur})
                      </Typography>
                    </li>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {(arretsDeterminesFormulaire.length > 0 || arretsDeterminesTicket.length > 0) && (
            <Card sx={{ backgroundColor: "#FFF3E0", mb: 2, border: "1px solid #FFE0B2" }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: "600", color: "#E65100", mb: 1 }}>
                  🔴 Arrêts déterminés:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2, color: "#E65100" }}>
                  {arretsDeterminesFormulaire.map((arret, index) => (
                    <li key={`${modeleVehicule}-arret-form-${index}`}>
                      <Typography variant="body2">
                        {new Date(arret.heure_debut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {new Date(arret.heure_fin).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                        (Formulaire: {arret.cause})
                      </Typography>
                    </li>
                  ))}
                  {arretsDeterminesTicket.map((arret, index) => (
                    <li key={`${modeleVehicule}-arret-ticket-${index}`}>
                      <Typography variant="body2">
                        {new Date(arret.heure_debut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {new Date(arret.heure_fin).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                        (Ticket: {arret.cause})
                      </Typography>
                    </li>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {sortedArretsNonDetermines.length === 0 ? (
            <Typography variant="body2" sx={{ fontStyle: "italic", color: "#8B7355", textAlign: "center", py: 2 }}>
              Aucun arrêt non déterminé.
            </Typography>
          ) : (
            <Card sx={{ backgroundColor: "#FFF8E1", border: "1px solid #FFECB3" }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: "600", color: "#F57F17", mb: 1 }}>
                  ⚫ Arrêts non déterminés (cliquez pour préciser):
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {sortedArretsNonDetermines.map((arret, index) => (
                    <li key={`${modeleVehicule}-arret-non-det-${index}`}>
                      <Typography
                        variant="body2"
                        onClick={() =>
                          handleArretNonDetermineClick({
                            type: "arretNonDetermine",
                            details: {
                              activiteOriginal: arret,
                              vehiculeId: currentVehiculeId,
                            },
                          })
                        }
                        sx={{
                          cursor: "pointer",
                          color: "#E65100",
                          textDecoration: "underline",
                          "&:hover": { color: "#BF360C" },
                        }}
                      >
                        {new Date(arret.heure_debut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
                        {new Date(arret.heure_fin).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (Non
                        déterminé)
                      </Typography>
                    </li>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    )
  }

  // Custom Tooltip component for Recharts
  const CustomRechartsTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Find the payload item that matches the currently hovered key
      const current = payload.find(p => p.dataKey === hoveredChartKey);
      if (!current) return null; // If no matching bar is hovered, don't show tooltip

      const activityType = String(current.dataKey).includes("travail")
        ? "Travail"
        : String(current.dataKey).includes("arretDetermine")
          ? "Arrêt Déterminé"
          : typeof current.dataKey === "string" && current.dataKey.includes("arretNonDetermine")
            ? "Arrêt Non Déterminé"
            : current.dataKey; // Fallback

      const poste = typeof current.dataKey === "string" && current.dataKey.includes("poste1")
        ? "Poste 1"
        : typeof current.dataKey === "string" && current.dataKey.includes("poste2")
          ? "Poste 2"
          : typeof current.dataKey === "string" && current.dataKey.includes("poste3")
            ? "Poste 3"
            : ""; // Fallback

      return (
        <div style={{
          backgroundColor: '#F5F5DC', // Background color from theme
          border: '1px solid #8B7355', // Border color from theme
          borderRadius: '8px',
          padding: '10px',
          fontSize: '14px',
          color: '#2F4F2F' // Text color
        }}>
          <strong>{label}</strong><br /> {/* Vehicle name */}
          <span style={{ color: current.color }}>
            {poste} - {activityType} : {safeRound(current.value, 2)}h
          </span>
        </div>
      );
    }
    return null;
  };

  // Rendu du graphique horizontal continu avec tous les véhicules
  const renderVerticalTimeline = ({ timelineData }) => {
    if (!timelineData || Object.keys(timelineData).length === 0) {
      return (
        <Card sx={{ backgroundColor: "#F5F5DC", textAlign: "center", py: 4 }}>
          <Typography variant="body1" sx={{ color: "#8B7355" }}>
            Aucune donnée disponible pour les graphiques verticaux
          </Typography>
        </Card>
      )
    }

    // Créer les données pour le graphique horizontal continu
    const prepareHorizontalData = () => {
      const vehicleData = []

      Object.entries(timelineData).forEach(([vehicule, activites]) => {
        // Initialiser les données pour les 3 postes
        const vehiculeRow = {
          vehicule: vehicule,
          // Poste 1 (7h-15h)
          poste1_travail: 0,
          poste1_arretDetermine: 0,
          poste1_arretNonDetermine: 0,
          // Poste 2 (15h-23h)
          poste2_travail: 0,
          poste2_arretDetermine: 0,
          poste2_arretNonDetermine: 0,
          // Poste 3 (23h-7h du lendemain)
          poste3_travail: 0,
          poste3_arretDetermine: 0,
          poste3_arretNonDetermine: 0,
        }

        if (Array.isArray(activites)) {
          activites.forEach((act) => {
            const activityDebut = safeNumber(act?.debut, 0)
            let activityFin = safeNumber(act?.fin, 0)

            // Si l'activité se termine le jour suivant (ex: 23h -> 7h le lendemain)
            // et que l'heure de fin ajustée est avant l'heure de début ajustée,
            // ajuster l'heure de fin en ajoutant 24 heures pour la continuité visuelle.
            if (activityFin < activityDebut) {
              activityFin += 24
            }

            const actType = act?.type || "autre"

            // Calculer la répartition sur les 3 postes
            for (const posteNum in POSTES) {
              const posteConfig = POSTES[posteNum]
              const posteStart = safeNumber(posteConfig.debut, 0)
              const posteEnd = safeNumber(posteConfig.fin, 24) // Utiliser 24 comme fin par défaut pour éviter les problèmes

              // Calculer le chevauchement entre l'activité et le poste
              const overlapStart = Math.max(activityDebut, posteStart)
              const overlapEnd = Math.min(activityFin, posteEnd)

              if (overlapEnd > overlapStart) {
                const overlapDuration = overlapEnd - overlapStart
                const postePrefix = `poste${posteNum}_`

                if (actType === "travail") {
                  vehiculeRow[postePrefix + "travail"] += safeRound(overlapDuration, 2)
                } else if (actType === "arretDetermine") {
                  vehiculeRow[postePrefix + "arretDetermine"] += safeRound(overlapDuration, 2)
                } else if (actType === "arretNonDetermine") {
                  vehiculeRow[postePrefix + "arretNonDetermine"] += safeRound(overlapDuration, 2)
                }
              }
            }
          })
        }

        vehicleData.push(vehiculeRow)
      })

      return vehicleData
    }

    const chartData = prepareHorizontalData()
    console.log("Chart Data for BarChart:", chartData); // DEBUG LOG

    if (chartData.length === 0 || chartData.every(row => Object.values(row).every(val => typeof val === 'string' || val === 0))) {
      return (
        <Card sx={{ backgroundColor: "#F5F5DC", textAlign: "center", py: 4 }}>
          <Typography variant="body1" sx={{ color: "#8B7355" }}>
            Aucune donnée à afficher dans le graphique. Vérifiez les logs de la console.
          </Typography>
        </Card>
      )
    }

    return (
      <Card sx={{ backgroundColor: "#F5F5DC", p: 3, mb: 4, border: "1px solid #E0E0E0" }}>
        <Typography variant="h6" sx={{ textAlign: "center", mb: 3, color: "#6B8E23", fontWeight: "600" }}>
          Timeline d'Activité par Véhicule et Poste
          {selectedPoste !== "ALL" ? ` - ${POSTES[selectedPoste]?.label}` : " - Tous postes"}
        </Typography>

        <Box sx={{ width: "100%", height: 550 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />

              {/* Axe X horizontal (valeurs numériques) */}
              <XAxis
                type="number"
                domain={[0, 24]} // L'échelle de temps de 0 à 24 heures
                stroke="#8B7355"
                label={{ value: "Heures", position: "insideBottom", offset: -10 }}
                tickFormatter={(value) => `${Math.round(value)}h`}
              />

              {/* Axe Y vertical (noms des véhicules) */}
              <YAxis
                type="category"
                dataKey="vehicule"
                stroke="#8B7355"
                width={120} // Augmenté pour plus de lisibilité des noms de véhicules
              />

              {/* Custom Tooltip using the hoveredChartKey state */}
              <RechartsTooltip
                content={<CustomRechartsTooltip active={undefined} payload={undefined} label={undefined} />}
                contentStyle={{
                  backgroundColor: "#F5F5DC",
                  border: "1px solid #8B7355",
                  borderRadius: "8px",
                }}
              />

              {/* Barres pour Poste 1 */}
              <Bar
                dataKey="poste1_travail"
                stackId="poste"
                fill={COLORS.TRAVAIL}
                name="poste1_travail"
                onMouseOver={() => setHoveredChartKey("poste1_travail")}
                onMouseLeave={() => setHoveredChartKey(null)}
              />
              <Bar
                dataKey="poste1_arretDetermine"
                stackId="poste"
                fill={COLORS.ARRET_DETERMINE}
                name="poste1_arretDetermine"
                onMouseOver={() => setHoveredChartKey("poste1_arretDetermine")}
                onMouseLeave={() => setHoveredChartKey(null)}
              />
              <Bar
                dataKey="poste1_arretNonDetermine"
                stackId="poste"
                fill={COLORS.ARRET_NON_DETERMINE}
                name="poste1_arretNonDetermine"
                onMouseOver={() => setHoveredChartKey("poste1_arretNonDetermine")}
                onMouseLeave={() => setHoveredChartKey(null)}
              />

              {/* Barres pour Poste 2 */}
              <Bar
                dataKey="poste2_travail"
                stackId="poste"
                fill={COLORS.TRAVAIL}
                name="poste2_travail"
                onMouseOver={() => setHoveredChartKey("poste2_travail")}
                onMouseLeave={() => setHoveredChartKey(null)}
              />
              <Bar
                dataKey="poste2_arretDetermine"
                stackId="poste"
                fill={COLORS.ARRET_DETERMINE}
                name="poste2_arretDetermine"
                onMouseOver={() => setHoveredChartKey("poste2_arretDetermine")}
                onMouseLeave={() => setHoveredChartKey(null)}
              />
              <Bar
                dataKey="poste2_arretNonDetermine"
                stackId="poste"
                fill={COLORS.ARRET_NON_DETERMINE}
                name="poste2_arretNonDetermine"
                onMouseOver={() => setHoveredChartKey("poste2_arretNonDetermine")}
                onMouseLeave={() => setHoveredChartKey(null)}
              />

              {/* Barres pour Poste 3 */}
              <Bar
                dataKey="poste3_travail"
                stackId="poste"
                fill={COLORS.TRAVAIL}
                name="poste3_travail"
                onMouseOver={() => setHoveredChartKey("poste3_travail")}
                onMouseLeave={() => setHoveredChartKey(null)}
              />
              <Bar
                dataKey="poste3_arretDetermine"
                stackId="poste"
                fill={COLORS.ARRET_DETERMINE}
                name="poste3_arretDetermine"
                onMouseOver={() => setHoveredChartKey("poste3_arretDetermine")}
                onMouseLeave={() => setHoveredChartKey(null)}
              />
              <Bar
                dataKey="poste3_arretNonDetermine"
                stackId="poste"
                fill={COLORS.ARRET_NON_DETERMINE}
                name="poste3_arretNonDetermine"
                onMouseOver={() => setHoveredChartKey("poste3_arretNonDetermine")}
                onMouseLeave={() => setHoveredChartKey(null)}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Légende et indicateurs */}
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 2, mb: 2 }}>
            <Chip label="Travail" sx={{ backgroundColor: COLORS.TRAVAIL, color: "white" }} size="small" />
            <Chip
              label="Arrêt Déterminé"
              sx={{ backgroundColor: COLORS.ARRET_DETERMINE, color: "white" }}
              size="small"
            />
            <Chip
              label="Arrêt Non Déterminé"
              sx={{ backgroundColor: COLORS.ARRET_NON_DETERMINE, color: "white" }}
              size="small"
            />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 3, mt: 2 }}>
            <Typography variant="body2" sx={{ color: "#6B8E23", fontWeight: "600" }}>
              📍 Poste 1: 7h-15h
            </Typography>
            <Typography variant="body2" sx={{ color: "#6B8E23", fontWeight: "600" }}>
              📍 Poste 2: 15h-23h
            </Typography>
            <Typography variant="body2" sx={{ color: "#6B8E23", fontWeight: "600" }}>
              📍 Poste 3: 23h-7h
            </Typography>
          </Box>
        </Box>
      </Card>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 3, backgroundColor: "#FEFEFE", minHeight: "100vh" }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: "600", color: "#6B8E23" }}>
              Film d'activité des engins
            </Typography>
          </Box>
          <Typography variant="subtitle1" sx={{ color: "#8B7355" }}>
            Gestion des activités et fin de poste
          </Typography>
        </Box>

        {/* Onglets pour filtrer par poste */}  
        <Paper sx={{ backgroundColor: "#F5F5DC", mb: 3 }}>
          <Tabs
            value={selectedPoste}
            onChange={handlePosteChange}
            sx={{
              "& .MuiTab-root": { color: "#8B7355" },
              "& .Mui-selected": { color: "#6B8E23" },
              "& .MuiTabs-indicator": { backgroundColor: "#6B8E23" },
            }}
          >
          </Tabs>
        </Paper>

        {/* Graphique vertical avec layout inversé */}
        {renderVerticalTimeline({ timelineData })}

        <Divider sx={{ my: 4, backgroundColor: "#E0E0E0" }} />

        {/* Formulaire de fin de poste */}
        <Card sx={{ backgroundColor: "#F5F5DC", border: "1px solid #E0E0E0" }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ color: "#6B8E23", fontWeight: "600", mb: 3 }}>
              Enregistrer une Fin de Poste
            </Typography>

            <form onSubmit={handleSubmitFinPoste}>
              <Stack spacing={3}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Nom"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": { backgroundColor: "white", borderRadius: "8px" },
                    }}
                  />
                  <TextField
                    label="Prénom"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": { backgroundColor: "white", borderRadius: "8px" },
                    }}
                  />
                </Stack>

                <TextField
                  label="Numéro de téléphone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": { backgroundColor: "white", borderRadius: "8px" },
                  }}
                />

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Date du poste"
                    name="date_poste"
                    type="date"
                    value={formData.date_poste}
                    onChange={handleChange}
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      "& .MuiOutlinedInput-root": { backgroundColor: "white", borderRadius: "8px" },
                    }}
                  />

                  <FormControl fullWidth required>
                    <InputLabel>Poste</InputLabel>
                    <Select
                      name="poste"
                      value={formData.poste}
                      onChange={handleChange}
                      sx={{ backgroundColor: "white", borderRadius: "8px" }}
                    >
                      {postesDisponibles.map((poste) => (
                        <MenuItem key={poste} value={poste}>
                          {POSTES[poste].label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                <FormControl fullWidth required>
                  <InputLabel>Véhicule</InputLabel>
                  <Select
                    name="modele"
                    value={formData.modele}
                    onChange={handleChange}
                    sx={{ backgroundColor: "white", borderRadius: "8px" }}
                  >
                    {vehiculesDisponibles.map((vehicule) => (
                      <MenuItem key={vehicule.id} value={vehicule.modele}>
                        {vehicule.modele}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Heure de début"
                    name="heure_debut"
                    type="time"
                    value={formData.heure_debut}
                    onChange={handleChange}
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      "& .MuiOutlinedInput-root": { backgroundColor: "white", borderRadius: "8px" },
                    }}
                  />
                  <TextField
                    label="Heure de fin"
                    name="heure_fin"
                    type="time"
                    value={formData.heure_fin}
                    onChange={handleChange}
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{
                      "& .MuiOutlinedInput-root": { backgroundColor: "white", borderRadius: "8px" },
                    }}
                  />
                </Stack>

                <TextField
                  label="Heure de fin du compteur"
                  name="heure_de_fin_du_compteur"
                  value={formData.heure_de_fin_du_compteur}
                  onChange={handleChange}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": { backgroundColor: "white", borderRadius: "8px" },
                  }}
                />

                <TextField
                  label="Commentaire"
                  name="commentaire"
                  value={formData.commentaire}
                  onChange={handleChange}
                  multiline
                  rows={3}
                  fullWidth
                  sx={{
                    "& .MuiOutlinedInput-root": { backgroundColor: "white", borderRadius: "8px" },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  sx={{
                    mt: 2,
                    backgroundColor: "#6B8E23",
                    "&:hover": { backgroundColor: "#556B2F" },
                    borderRadius: "8px",
                    py: 1.5,
                  }}
                >
                  Enregistrer la fin de poste
                </Button>
              </Stack>
            </form>

            {enregistrementStatus && (
              <Alert
                severity={enregistrementStatus.includes("Succès") ? "success" : "error"}
                sx={{
                  mt: 2,
                  backgroundColor: enregistrementStatus.includes("Succès") ? "#E8F5E8" : "#FFF3E0",
                }}
              >
                {enregistrementStatus}
              </Alert>
            )}

            {errorMessage && (
              <Alert severity="error" sx={{ mt: 2, backgroundColor: "#FFF3E0" }}>
                {errorMessage}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Dialog pour la déclaration de panne */}
        <Dialog open={isPanneFormOpen} onClose={handleClosePanneForm} maxWidth="md" fullWidth>
          <DialogTitle sx={{ backgroundColor: "#6B8E23", color: "white" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <WarningIcon sx={{ mr: 1 }} />
              Déclarer la cause de l'arrêt
            </Box>
          </DialogTitle>
          <DialogContent sx={{ backgroundColor: "#F5F5DC", p: 3 }}>
            {selectedArretNonDetermine && (
              <Card sx={{ mb: 3, backgroundColor: "white" }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color: "#2F4F2F" }}>
                    <strong>Période:</strong> {new Date(selectedArretNonDetermine.heure_debut).toLocaleString()} -{" "}
                    {new Date(selectedArretNonDetermine.heure_fin).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            )}

            <form onSubmit={handleSubmitPanne}>
              <Stack spacing={3}>
                <Typography variant="h6" sx={{ color: "#6B8E23" }}>
                  Sélectionnez les causes connues:
                </Typography>

                <Card sx={{ backgroundColor: "white", p: 2 }}>
                  {pannesConues.map((panne) => (
                    <FormControlLabel
                      key={panne.id}
                      control={
                        <Checkbox
                          value={panne.id}
                          checked={selectedPannes.includes(panne.id)}
                          onChange={handlePanneCheckboxChange}
                          sx={{ color: "#6B8E23" }}
                        />
                      }
                      label={panne.nom}
                      sx={{ display: "block", mb: 1 }}
                    />
                  ))}
                </Card>

                <TextField
                  label="Autre cause (personnalisée)"
                  value={pannePersonnalisee}
                  onChange={handlePannePersonnaliseeChange}
                  fullWidth
                  multiline
                  rows={2}
                  sx={{
                    "& .MuiOutlinedInput-root": { backgroundColor: "white", borderRadius: "8px" },
                  }}
                />

                <TextField
                  label="Description détaillée"
                  value={descriptionPanne}
                  onChange={handleDescriptionPanneChange}
                  fullWidth
                  multiline
                  rows={3}
                  sx={{
                    "& .MuiOutlinedInput-root": { backgroundColor: "white", borderRadius: "8px" },
                  }}
                />
              </Stack>
            </form>

            {submissionPanneStatus && (
              <Alert
                severity={submissionPanneStatus.includes("Succès") ? "success" : "error"}
                sx={{
                  mt: 2,
                  backgroundColor: submissionPanneStatus.includes("Succès") ? "#E8F5E8" : "#FFF3E0",
                }}
              >
                {submissionPanneStatus}
              </Alert>
            )}

            {errorMessagePanne && (
              <Alert severity="error" sx={{ mt: 2, backgroundColor: "#FFF3E0" }}>
                {errorMessagePanne}
              </Alert>
            )}
          </DialogContent>

          <DialogActions sx={{ backgroundColor: "#F5F5DC", p: 2 }}>
            <Button onClick={handleClosePanneForm} sx={{ color: "#8B7355" }}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmitPanne}
              variant="contained"
              sx={{ backgroundColor: "#6B8E23", "&:hover": { backgroundColor: "#556B2F" } }}
            >
              Enregistrer la cause
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar pour les notifications */}
        <Snackbar
          open={snackbarOpen}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert onClose={handleCloseSnackbar}
            // @ts-ignore
            severity={snackbarSeverity} sx={{ width: "100%" }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  )
}

export default PermanencierCamionFormulaireFin