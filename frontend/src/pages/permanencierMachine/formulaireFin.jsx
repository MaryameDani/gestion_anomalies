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
  Tooltip,
} from "@mui/material"
import { createTheme, ThemeProvider } from "@mui/material/styles"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

const theme = createTheme({
  palette: {
    primary: {
      main: "#B7CE66", // Vert
    },
    secondary: {
      main: "#f50057", // Rose
    },
    error: {
      main: "#f44336", // Rouge pour arrêts déterminés
    },
    warning: {
      main: "#ffc107", // Jaune pour arrêts non déterminés
    },
    success: {
      main: "#4caf50", // Vert pour travail
    },
  },
})

// Couleurs pour le tableau de bord
const COLORS = {
  TRAVAIL: "#4caf50", // Vert
  ARRET_DETERMINE: "#f44336", // Rouge
  ARRET_NON_DETERMINE: "#ffc107", // Jaune
}

// Définition des postes
const POSTES = {
  1: { debut: 7, fin: 15, label: "Poste 1 (7h-15h)" },
  2: { debut: 15, fin: 23, label: "Poste 2 (15h-23h)" },
  3: { debut: 23, fin: 31, label: "Poste 3 (23h-7h)" }, // 31 représente 7h le jour suivant (23 + 8 heures pour 7h le lendemain)
  ALL: { debut: 7, fin: 31, label: "Tous les postes (7h-7h)" },
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

const PermanencierMachineFormulaireFin = () => {
  const [formData, setFormData] = useState({
    type_vehicule: "MACHINE",
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

  // activiteVehicules stockera un objet où la clé est le modèle du véhicule et la valeur est l'objet d'activité complet
  const [activiteVehicules, setActiviteVehicules] = useState({})
  const [loadingActivite, setLoadingActivite] = useState(true)
  const [errorActivite, setErrorActivite] = useState("")

  // selectedArretNonDetermine doit inclure l'ID du véhicule et les heures de l'arrêt
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

  // État pour stocker les données du graphique
  const [timelineData, setTimelineData] = useState({})

  // État pour la sélection de l'onglet de poste actif
  const [selectedPoste, setSelectedPoste] = useState("ALL")

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
      if (response.data && Array.isArray(response.data)) {
        const groupedActivite = {}
        response.data.forEach((item) => {
          groupedActivite[item.vehicule] = item
        })
        setActiviteVehicules(groupedActivite)

        // Préparer les données pour les graphiques
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

  // Convertir une date ISO en heure décimale (0-24)
  const dateToHourDecimal = (dateStr) => {
    if (!dateStr) return 0
    const date = new Date(dateStr)
    return date.getHours() + date.getMinutes() / 60
  }

  // Ajuster l'heure pour le graphique (pour gérer le poste de nuit qui chevauche deux jours)
  const adjustHourForChart = (hour) => {
    // Si l'heure est entre 0 et 7, on l'ajuste pour qu'elle apparaisse après 23h
    return hour >= 0 && hour < 7 ? hour + 24 : hour
  }

  // Préparer les données pour le graphique timeline
  const prepareTimelineData = (activiteData) => {
    const timelineData = {}

    Object.entries(activiteData).forEach(([vehicule, data]) => {
      const vehiculeInfo = vehiculesDisponibles.find((v) => v.modele === vehicule)
      if (vehiculeInfo && vehiculeInfo.type_vehicule?.toUpperCase() === "MACHINE") {
        const activites = data.activites || []
        const timelineActivities = []

        activites.forEach((activite) => {
          const debutHeure = dateToHourDecimal(activite.heure_debut)
          const finHeure = dateToHourDecimal(activite.heure_fin)

          // Ajuster les heures pour le graphique
          const debutAjuste = adjustHourForChart(debutHeure)
          let finAjuste = adjustHourForChart(finHeure)

          // If activity spans across midnight, adjust finAjuste relative to debutAjuste
          // This ensures finAjuste is always greater than debutAjuste for duration calculation
          if (finAjuste <= debutAjuste && (finHeure < 7 || finHeure > 23)) { // Only add 24 if it's genuinely the next day for a multi-day range
            finAjuste += 24;
          }

          // Déterminer le type d'activité
          const typeNormalise = normalizeString(activite.type || "")
          let typeActivite = "autre"

          if (typeNormalise === "travail") {
            typeActivite = "travail"
          } else if (typeNormalise.includes("arret_determine") || typeNormalise.includes("arret_déterminé")) {
            typeActivite = "arretDetermine"
          } else if (typeNormalise.includes("arret_non_determine") || typeNormalise.includes("arret_non_déterminé")) {
            typeActivite = "arretNonDetermine"
          }

          // Ajouter l'activité à la timeline
          timelineActivities.push({
            debut: debutAjuste,
            fin: finAjuste,
            duree: Math.max(0.01, finAjuste - debutAjuste), // Ensure duration is not negative or zero
            type: typeActivite,
            poste: determinerPoste(debutAjuste),
            details: {
              heureDebut: new Date(activite.heure_debut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              heureFin: new Date(activite.heure_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              conducteur: activite.conducteur || "Non spécifié",
              cause: activite.cause || "",
              vehiculeId: vehiculeInfo.id,
              activiteOriginal: activite,
            },
          })
        })

        timelineData[vehicule] = timelineActivities
      }
    })

    setTimelineData(timelineData)
  }

  // Déterminer le poste en fonction de l'heure
  const determinerPoste = (heure) => {
    // Ajuster l'heure si nécessaire (pour le poste de nuit)
    const heureAjustee = heure > 24 ? heure - 24 : heure

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
    setSelectedPoste(newValue);
  };

  useEffect(() => {
    setPostesDisponibles([1, 2, 3])

    const fetchVehicules = async () => {
      setLoadingVehicules(true)
      try {
        const response = await api.get("/api/vehicules/")
        if (Array.isArray(response.data)) {
          setVehiculesDisponibles(response.data.filter((v) => v.type_vehicule?.toUpperCase() === "MACHINE"))
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

  // Mettre à jour les données du graphique lorsque les véhicules sont chargés
  useEffect(() => {
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
      <Box key={modeleVehicule} sx={{ border: "1px solid #ccc", p: 2, mb: 2, borderRadius: "8px" }}>
        <Typography variant="subtitle1" fontWeight="bold">
          Engin: {modeleVehicule}
        </Typography>

        {heuresTravaillees && Object.keys(heuresTravaillees).length > 0 && (
          <Box sx={{ backgroundColor: "#e0f7fa", padding: "8px", borderRadius: "3px", mb: 1 }}>
            <Typography variant="body2">
              ⏱️ <strong>Heures travaillées:</strong>
              {Object.entries(heuresTravaillees).map(([poste, heures]) => (
                <span key={`${modeleVehicule}-heures-${poste}`}>
                  {" "}
                  Poste {poste}: {heures}h{" "}
                </span>
              ))}
            </Typography>
          </Box>
        )}

        {travaux.length > 0 && (
          <Box sx={{ backgroundColor: COLORS.TRAVAIL, padding: "8px", borderRadius: "3px", mb: 1, color: "white" }}>
            <Typography variant="body2">
              ✅ <strong>Travaux:</strong>
            </Typography>
            <ul>
              {travaux.map((travail, index) => (
                <li key={`${modeleVehicule}-travail-${travail.heure_debut}-${index}`}>
                  {new Date(travail.heure_debut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{" "}
                  {new Date(travail.heure_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Poste: {travail.poste}, Conducteur:{" "}
                  {travail.conducteur})
                </li>
              ))}
            </ul>
          </Box>
        )}

        {(arretsDeterminesFormulaire.length > 0 || arretsDeterminesTicket.length > 0) && (
          <Box
            sx={{ backgroundColor: COLORS.ARRET_DETERMINE, padding: "8px", borderRadius: "3px", mb: 1, color: "white" }}
          >
            <Typography variant="body2" fontWeight="bold">
              🔴 Arrêts déterminés:
            </Typography>
            <ul>
              {arretsDeterminesFormulaire.map((arret, index) => (
                <li key={`${modeleVehicule}-arret-form-${index}`}>
                  {new Date(arret.heure_debut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(arret.heure_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{" "}
                  (Formulaire: {arret.cause})
                </li>
              ))}
              {arretsDeterminesTicket.map((arret, index) => (
                <li key={`${modeleVehicule}-arret-ticket-${index}`}>
                  {new Date(arret.heure_debut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(arret.heure_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{" "}
                  (Ticket: {arret.cause})
                </li>
              ))}
            </ul>
          </Box>
        )}

        {sortedArretsNonDetermines.length === 0 ? (
          <Typography variant="body2" fontStyle="italic">
            Aucun arrêt non déterminé.
          </Typography>
        ) : (
          <Box sx={{ backgroundColor: COLORS.ARRET_NON_DETERMINE, padding: "8px", borderRadius: "3px" }}>
            <Typography variant="body2" fontWeight="bold">
              ⚫ Arrêts non déterminés (cliquez pour préciser):
            </Typography>
            <ul>
              {sortedArretsNonDetermines.map((arret, index) => (
                <li key={`${modeleVehicule}-arret-non-det-${index}`}>
                  <span
                    onClick={() =>
                      handleArretNonDetermineClick({
                        type: "arretNonDetermine",
                        details: {
                          activiteOriginal: arret,
                          vehiculeId: currentVehiculeId,
                        },
                      })
                    }
                    style={{ cursor: "pointer", color: "black", textDecoration: "underline" }}
                  >
                    {new Date(arret.heure_debut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{" "}
                    {new Date(arret.heure_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Non déterminé)
                  </span>
                </li>
              ))}
            </ul>
          </Box>
        )}
      </Box>
    )
  }

  // Rendu du graphique horizontal pour chaque véhicule
  // Rendu du graphique horizontal pour chaque véhicule
  const renderHorizontalTimeline = () => {
    if (Object.keys(timelineData).length === 0) {
      return (
        <Typography variant="body1" sx={{ textAlign: "center", my: 3 }}>
          Aucune donnée disponible pour les graphiques
        </Typography>
      )
    }

    // Définir les limites du graphique en fonction du poste sélectionné
    const posteConfig = selectedPoste === "ALL" ? POSTES.ALL : POSTES[selectedPoste];
    const domainMin = posteConfig.debut;
    const domainMax = posteConfig.fin;

    return (
      <Box sx={{ mt: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold", color: "primary.main" }}>
          Activité des Machines par Poste
        </Typography>

        {/* Onglets pour filtrer par poste */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={selectedPoste}
            onChange={handlePosteChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
            aria-label="filtrage par poste"
          >
            <Tab value="ALL" label={POSTES.ALL.label} />
            <Tab value="1" label={POSTES[1].label} />
            <Tab value="2" label={POSTES[2].label} />
            <Tab value="3" label={POSTES[3].label} />
          </Tabs>
        </Box>

        {Object.entries(timelineData).map(([vehicule, activites]) => {
          // Préparer les données pour le graphique horizontal
          // Créer des segments de 24 heures divisés en créneaux de 30 minutes pour plus de granularité
          const timeSlots = [];
          const slotDuration = 0.5; // 30 minutes = 0.5 heure

          // Créer les créneaux horaires selon le poste sélectionné
          for (let hour = domainMin; hour < domainMax; hour += slotDuration) {
            timeSlots.push({
              time: hour,
              timeLabel: hour > 24 ? `${Math.floor(hour - 24)}:${((hour % 1) * 60).toString().padStart(2, '0')}`
                : `${Math.floor(hour)}:${((hour % 1) * 60).toString().padStart(2, '0')}`,
              travail: 0,
              arretDetermine: 0,
              arretNonDetermine: 0,
              activities: [] // Stocker les activités pour les tooltips
            });
          }

          // Remplir les créneaux avec les activités
          activites.forEach(act => {
            console.log("Processing activity:", act.type, "Normalized type:", act.type); // Debug

            // Filtrer selon le poste sélectionné si nécessaire
            if (selectedPoste !== "ALL") {
              const posteNum = parseInt(selectedPoste);
              const posteStart = POSTES[posteNum].debut;
              const posteEnd = POSTES[posteNum].fin;

              // Vérifier si l'activité chevauche avec le créneau du poste
              if (!(act.debut < posteEnd && act.fin > posteStart)) {
                return; // Skip cette activité
              }
            }

            // Pour chaque créneau, vérifier s'il y a une activité
            timeSlots.forEach(slot => {
              const slotStart = slot.time;
              const slotEnd = slot.time + slotDuration;

              // Vérifier si l'activité chevauche avec ce créneau
              if (act.debut < slotEnd && act.fin > slotStart) {
                // Calculer le pourcentage de chevauchement
                const overlapStart = Math.max(act.debut, slotStart);
                const overlapEnd = Math.min(act.fin, slotEnd);
                const overlapDuration = overlapEnd - overlapStart;
                const overlapPercentage = overlapDuration / slotDuration;

                console.log("Activity overlap found:", act.type, "percentage:", overlapPercentage); // Debug

                // Assigner l'activité au bon type
                if (act.type === "travail") {
                  slot.travail = Math.max(slot.travail, overlapPercentage);
                } else if (act.type === "arretDetermine") {
                  slot.arretDetermine = Math.max(slot.arretDetermine, overlapPercentage);
                } else if (act.type === "arretNonDetermine") {
                  slot.arretNonDetermine = Math.max(slot.arretNonDetermine, overlapPercentage);
                  console.log("Arret non determiné found, slot updated:", slot.arretNonDetermine); // Debug
                }

                // Ajouter l'activité pour le tooltip
                if (!slot.activities.some(a => a.debut === act.debut && a.fin === act.fin)) {
                  slot.activities.push(act);
                }
              }
            });
          });

          // Filtrer les créneaux qui n'ont aucune activité pour un affichage plus propre
          const activeSlots = timeSlots.filter(slot =>
            slot.travail > 0 || slot.arretDetermine > 0 || slot.arretNonDetermine > 0
          );

          if (activeSlots.length === 0) {
            return (
              <Paper key={vehicule} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>{vehicule}</Typography>
                <Typography variant="body2" sx={{ textAlign: "center", py: 2 }}>
                  Aucune activité pour ce poste.
                </Typography>
              </Paper>
            );
          }

          return (
            <Paper key={vehicule} sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {vehicule}
              </Typography>

              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={activeSlots}
                  margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timeLabel"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={Math.floor(activeSlots.length / 12)} // Afficher environ 12 labels maximum
                  />
                  <YAxis
                    domain={[0, 1]}
                    tickFormatter={(value) => `${Math.round(value * 100)}%`}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        if (!data || !data.activities || data.activities.length === 0) return null;

                        return (
                          <div style={{
                            backgroundColor: "#fff",
                            padding: "12px",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                          }}>
                            <p><strong>Heure:</strong> {label}</p>
                            {data.activities.map((act, idx) => (
                              <div key={idx} style={{
                                marginTop: "8px", padding: "4px", borderLeft: `3px solid ${act.type === "travail" ? COLORS.TRAVAIL :
                                  act.type === "arretDetermine" ? COLORS.ARRET_DETERMINE :
                                    COLORS.ARRET_NON_DETERMINE
                                  }`, paddingLeft: "8px"
                              }}>
                                <p><strong>Type:</strong> {
                                  act.type === "travail" ? "Travail" :
                                    act.type === "arretDetermine" ? "Arrêt déterminé" :
                                      "Arrêt non déterminé"
                                }</p>
                                <p><strong>Période:</strong> {act.details.heureDebut} - {act.details.heureFin}</p>
                                {act.details.conducteur && <p><strong>Conducteur:</strong> {act.details.conducteur}</p>}
                                {act.details.cause && <p><strong>Cause:</strong> {act.details.cause}</p>}
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Lignes de référence pour les changements de poste */}
                  {(selectedPoste === "ALL" || selectedPoste === "1") && (
                    <ReferenceLine x="7:00" stroke="#666" strokeDasharray="2 2" />
                  )}
                  {(selectedPoste === "ALL" || selectedPoste === "2") && (
                    <ReferenceLine x="15:00" stroke="#666" strokeDasharray="2 2" />
                  )}
                  {(selectedPoste === "ALL" || selectedPoste === "3") && (
                    <ReferenceLine x="23:00" stroke="#666" strokeDasharray="2 2" />
                  )}

                  {/* Barres empilées pour chaque type d'activité */}
                  <Bar
                    dataKey="travail"
                    stackId="activities"
                    fill={COLORS.TRAVAIL}
                    name="Travail"
                  />
                  <Bar
                    dataKey="arretDetermine"
                    stackId="activities"
                    fill={COLORS.ARRET_DETERMINE}
                    name="Arrêt déterminé"
                  />
                  <Bar
                    dataKey="arretNonDetermine"
                    stackId="activities"
                    fill={COLORS.ARRET_NON_DETERMINE}
                    name="Arrêt non déterminé"
                    onClick={(data) => {
                      // Gérer les clics sur les arrêts non déterminés
                      if (data && data.activities) {
                        const arretNonDetermine = data.activities.find(act => act.type === "arretNonDetermine");
                        if (arretNonDetermine) {
                          handleArretNonDetermineClick(arretNonDetermine);
                        }
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>

              {/* Légende personnalisée */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, backgroundColor: COLORS.TRAVAIL }} />
                  <Typography variant="caption">Travail</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, backgroundColor: COLORS.ARRET_DETERMINE }} />
                  <Typography variant="caption">Arrêt déterminé</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, backgroundColor: COLORS.ARRET_NON_DETERMINE }} />
                  <Typography variant="caption">Arrêt non déterminé</Typography>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>
    );
  };


  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Permanencier des Machines
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Graphique timeline pour visualiser l'activité */}
        {renderHorizontalTimeline()}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom>
          Enregistrer la fin d'un poste
        </Typography>

        <form onSubmit={handleSubmitFinPoste}>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel id="vehicule-label">Engin</InputLabel>
              <Select
                labelId="vehicule-label"
                id="modele"
                name="modele"
                value={formData.modele}
                onChange={handleChange}
                required
              >
                {loadingVehicules ? (
                  <MenuItem disabled>Chargement...</MenuItem>
                ) : vehiculesDisponibles.length > 0 ? (
                  vehiculesDisponibles.map((vehicule) => (
                    <MenuItem key={vehicule.id} value={vehicule.modele}>
                      {vehicule.modele}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>Aucun engin disponible</MenuItem>
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="poste-label">Poste</InputLabel>
              <Select
                labelId="poste-label"
                id="poste"
                name="poste"
                value={formData.poste}
                onChange={handleChange}
                required
              >
                {postesDisponibles.map((poste) => (
                  <MenuItem key={poste} value={poste}>
                    {poste}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <TextField
                id="first_name"
                name="first_name"
                label="Prénom du conducteur"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </FormControl>

            <FormControl fullWidth>
              <TextField
                id="last_name"
                name="last_name"
                label="Nom du conducteur"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </FormControl>

            <FormControl fullWidth>
              <TextField
                id="phone"
                name="phone"
                label="Téléphone du conducteur"
                value={formData.phone}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl fullWidth>
              <TextField
                id="heure_debut"
                name="heure_debut"
                label="Heure de début"
                type="time"
                value={formData.heure_debut}
                onChange={handleChange}
                required
                InputLabelProps={{ shrink: true }}
              />
            </FormControl>

            <FormControl fullWidth>
              <TextField
                id="heure_fin"
                name="heure_fin"
                label="Heure de fin"
                type="time"
                value={formData.heure_fin}
                onChange={handleChange}
                required
                InputLabelProps={{ shrink: true }}
              />
            </FormControl>

            <FormControl fullWidth>
              <TextField
                id="heure_de_fin_du_compteur"
                name="heure_de_fin_du_compteur"
                label="Heure de fin du compteur"
                multiline
                value={formData.heure_de_fin_du_compteur}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </FormControl>

            <FormControl fullWidth>
              <TextField
                id="commentaire"
                name="commentaire"
                label="Commentaire"
                multiline
                rows={4}
                value={formData.commentaire}
                onChange={handleChange}
              />
            </FormControl>

            <Button type="submit" variant="contained" color="primary" disabled={loadingVehicules}>
              Enregistrer la fin de poste
            </Button>
          </Stack>
        </form>

        {enregistrementStatus && (
          <Box sx={{ mt: 3, p: 2, backgroundColor: enregistrementStatus.includes("Succès") ? "#e8f5e9" : "#ffebee" }}>
            <Typography>{enregistrementStatus}</Typography>
            {errorMessage && <Typography color="error">{errorMessage}</Typography>}
          </Box>
        )}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom>
          Activité des machines
        </Typography>

        {loadingActivite ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        ) : errorActivite ? (
          <Typography color="error">{errorActivite}</Typography>
        ) : Object.keys(activiteVehicules).length === 0 ? (
          <Typography>Aucune activité disponible.</Typography>
        ) : (
          Object.entries(activiteVehicules).map(([vehicule, data]) => {
            const currentVehicule = vehiculesDisponibles.find((v) => v.modele === vehicule)
            if (currentVehicule && currentVehicule.type_vehicule?.toUpperCase() === "MACHINE") {
              return renderVehicleActivite(vehicule, data)
            }
            return null
          })
        )}

        {/* Dialogue pour déclarer la panne d'un arrêt non déterminé */}
        <Dialog open={isPanneFormOpen} onClose={handleClosePanneForm} fullWidth maxWidth="md">
          <DialogTitle>Déclarer une panne pour l'arrêt non déterminé</DialogTitle>
          <DialogContent>
            {selectedArretNonDetermine && (
              <Box>
                <Typography variant="body1" gutterBottom>
                  Période: {new Date(selectedArretNonDetermine.heure_debut).toLocaleString()} à{" "}
                  {new Date(selectedArretNonDetermine.heure_fin).toLocaleString()}
                </Typography>

                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Sélectionner une ou plusieurs pannes connues:
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", maxHeight: "200px", overflowY: "auto", mb: 2 }}>
                  {pannesConues.map((panne) => (
                    <FormControlLabel
                      key={panne.id}
                      control={
                        <Checkbox
                          value={panne.id}
                          checked={selectedPannes.includes(panne.id)}
                          onChange={handlePanneCheckboxChange}
                        />
                      }
                      label={panne.libelle}
                    />
                  ))}
                </Box>

                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Ou décrire une nouvelle panne:
                </Typography>
                <TextField
                  fullWidth
                  label="Panne personnalisée"
                  value={pannePersonnalisee}
                  onChange={handlePannePersonnaliseeChange}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Description détaillée"
                  value={descriptionPanne}
                  onChange={handleDescriptionPanneChange}
                  margin="normal"
                  multiline
                  rows={4}
                />

                {submissionPanneStatus && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      backgroundColor: submissionPanneStatus.includes("Succès") ? "#e8f5e9" : "#ffebee",
                    }}
                  >
                    <Typography>{submissionPanneStatus}</Typography>
                    {errorMessagePanne && <Typography color="error">{errorMessagePanne}</Typography>}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePanneForm} color="inherit">
              Annuler
            </Button>
            <Button onClick={handleSubmitPanne} color="primary" variant="contained">
              Enregistrer
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar}
            // @ts-ignore
            severity={snackbarSeverity} sx={{ width: "100%" }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default PermanencierMachineFormulaireFin;