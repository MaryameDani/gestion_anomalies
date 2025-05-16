"use client"

// @ts-ignore
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    Typography,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    Grid,
    Snackbar,
    Alert,
    CircularProgress,
    FormControlLabel,
    Divider,
} from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#B7CE66', // Vert
        },
    },
});

const api = axios.create({
    baseURL: 'http://localhost:8000',
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

const PermanencierCamionFormulaireFin = () => {
    const [formData, setFormData] = useState({
        type_vehicule: 'CAMION',
        first_name: '',
        last_name: '',
        phone: '',
        date_poste: formatDate(new Date()),
        heure_debut: '',
        heure_fin: '',
        heure_de_fin_du_conteur: '',
        commentaire: '',
        poste: '',
        vehicule: '', // Pour la sélection du véhicule
    });
    const [postesDisponibles, setPostesDisponibles] = useState([]);
    const [enregistrementStatus, setEnregistrementStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [activiteVehicules, setActiviteVehicules] = useState([]);
    const [loadingActivite, setLoadingActivite] = useState(true);
    const [errorActivite, setErrorActivite] = useState('');
    const [selectedArretNonDetermine, setSelectedArretNonDetermine] = useState(null);
    const [pannesConues, setPannesConues] = useState([]);
    const [selectedPannes, setSelectedPannes] = useState([]);
    const [pannePersonnalisee, setPannePersonnalisee] = useState('');
    const [descriptionPanne, setDescriptionPanne] = useState('');
    const [submissionPanneStatus, setSubmissionPanneStatus] = useState(null);
    const [errorMessagePanne, setErrorMessagePanne] = useState('');
    const [vehiculesDisponibles, setVehiculesDisponibles] = useState([]);
    const [loadingVehicules, setLoadingVehicules] = useState(true);
    const [errorVehicules, setErrorVehicules] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    const showAlert = (message, severity) => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    // @ts-ignore
    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    const fetchActivite = async () => {
        setLoadingActivite(true);
        try {
            const response = await api.get('/api/activite/vehicules/');
            if (Array.isArray(response.data)) {
                setActiviteVehicules(response.data.filter(v => v.vehicule?.toUpperCase() === 'CAMION'));
            } else {
                console.error("Format inattendu pour l'activité des véhicules:", response.data);
                setErrorActivite("Erreur lors du chargement de l'activité.");
            }
        } catch (err) {
            console.error("Erreur lors de la récupération de l'activité des véhicules:", err);
            setErrorActivite("Erreur lors du chargement de l'activité.");
        } finally {
            setLoadingActivite(false);
        }
    };

    useEffect(() => {
        // Charger la liste des postes (simulé)
        setPostesDisponibles(['1', '2', '3']);

        // Charger l'activité des véhicules (CAMIONS)
        fetchActivite();

        // Charger les pannes connues pour les CAMIONS
        const fetchPannes = async () => {
            try {
                const response = await api.get('/api/pannes/');
                if (Array.isArray(response.data)) {
                    setPannesConues(response.data);
                } else {
                    console.error("Format inattendu pour les pannes:", response.data);
                    setErrorMessagePanne("Erreur lors du chargement des pannes.");
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des pannes connues:", error);
                setErrorMessagePanne("Erreur lors du chargement des pannes.");
                showAlert("Erreur lors du chargement des pannes.", "error");
            }
        };
        fetchPannes();

        // Charger les véhicules de type CAMION
        const fetchVehicules = async () => {
            setLoadingVehicules(true);
            try {
                const response = await api.get('/api/vehicules/');
                if (Array.isArray(response.data)) {
                    setVehiculesDisponibles(response.data.filter(v => v.type_vehicule?.toUpperCase() === 'CAMION'));
                } else {
                    console.error("Format inattendu pour les véhicules:", response.data);
                    setErrorVehicules("Erreur lors du chargement des véhicules.");
                }
            } catch (error) {
                console.error("Erreur lors de la récupération des véhicules:", error);
                setErrorVehicules("Erreur lors du chargement des véhicules.");
                showAlert("Erreur lors du chargement des véhicules.", "error");
            } finally {
                setLoadingVehicules(false);
            }
        };
        fetchVehicules();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleSubmitFinPoste = async (e) => {
        e.preventDefault();
        setEnregistrementStatus('En cours...');
        setErrorMessage('');

        try {
            const response = await api.post('/api/fin-poste/', formData);
            setEnregistrementStatus('Succès: ' + response.data.message);
            setFormData({ ...formData, heure_debut: '', heure_fin: '', heure_de_fin_du_conteur: '', commentaire: '', poste: '', vehicule: '' });
            fetchActivite(); // Refetch l'activité
            showAlert(response.data.message, 'success');
        } catch (error) {
            console.error("Erreur lors de l'enregistrement de la fin de poste:", error.response ? error.response.data : error.message);
            setEnregistrementStatus('Erreur lors de l\'enregistrement.');
            setErrorMessage(error.response?.data?.error || 'Une erreur inconnue est survenue.');
            showAlert(error.response?.data?.error || 'Une erreur inconnue est survenue.', 'error');
        }
    };

    const handleArretNonDetermineClick = (arret) => {
        setSelectedArretNonDetermine(arret);
        setSelectedPannes([]);
        setPannePersonnalisee('');
        setDescriptionPanne('');
        setSubmissionPanneStatus(null);
        setErrorMessagePanne('');
    };

    const handlePanneCheckboxChange = (event) => {
        const { value, checked } = event.target;
        if (checked) {
            setSelectedPannes([...selectedPannes, value]);
        } else {
            setSelectedPannes(selectedPannes.filter(panneId => panneId !== value));
        }
    };

    const handlePannePersonnaliseeChange = (event) => {
        setPannePersonnalisee(event.target.value);
    };

    const handleDescriptionPanneChange = (event) => {
        setDescriptionPanne(event.target.value);
    };

    const handleSubmitPanne = async (event) => {
        event.preventDefault();
        setSubmissionPanneStatus('Envoi en cours...');
        setErrorMessagePanne('');

        if (!selectedArretNonDetermine) {
            setErrorMessagePanne('Aucun arrêt non déterminé sélectionné.');
            setSubmissionPanneStatus('Erreur');
            showAlert('Aucun arrêt non déterminé sélectionné.', 'warning');
            return;
        }

        try {
            const response = await api.post('/api/formulaire/pannes/', {
                pannes_ids: selectedPannes,
                panne_personnalisee: pannePersonnalisee,
                description: descriptionPanne,
                // Vous pourriez avoir besoin d'envoyer des informations sur l'arrêt non déterminé
                // (date, heures) si votre backend en a besoin pour le contexte.
            });
            setSubmissionPanneStatus('Succès: ' + JSON.stringify(response.data));
            setSelectedArretNonDetermine(null);
            fetchActivite(); // Refetch l'activité
            showAlert('Cause de l\'arrêt enregistrée avec succès.', 'success');
        } catch (error) {
            console.error("Erreur lors de l'enregistrement de la panne:", error.response ? error.response.data : error.message);
            setSubmissionPanneStatus('Erreur lors de l\'enregistrement.');
            setErrorMessagePanne(error.response?.data?.detail || error.message || 'Une erreur est survenue.');
            showAlert(error.response?.data?.detail || error.message || 'Une erreur est survenue.', 'error');
        }
    };

    const handleClosePanneForm = () => {
        setSelectedArretNonDetermine(null);
    };

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const renderPosteActivite = (posteData) => {
        console.log("posteData in renderPosteActivite:", posteData); // Debug log
        return (
        <div style={{ border: '1px dashed #eee', margin: '5px', padding: '5px' }} key={posteData.id}>
            <h4>Poste: {posteData.nom_poste} ({new Date(posteData.heure_debut_poste).toLocaleTimeString()} - {new Date(posteData.heure_fin_poste).toLocaleTimeString()})</h4>
            <p>
                ✅ Heures de travail: {posteData.travail?.heure_debut_travail ? new Date(posteData.travail.heure_debut_travail).toLocaleTimeString() : 'N/A'} - {posteData.travail?.heure_fin_travail ? new Date(posteData.travail.heure_fin_travail).toLocaleTimeString() : 'N/A'} ({(posteData.travail?.heures_travaillees || 0)}h)
            </p>
            <div>
                🔴 Arrêts déterminés:
                {posteData.arrets_determines?.length > 0 ? (
                    <ul>
                        {posteData.arrets_determines.map((arret) => {
                            const arretKey = arret.id || `${posteData.id}-determined-${new Date(arret.debut).getTime()}`;
                            return (
                            <li key={arretKey}>
                                {new Date(arret.debut).toLocaleTimeString()} - {new Date(arret.fin).toLocaleTimeString()} ({arret.type})
                            </li>
                        )})}
                    </ul>
                ) : (
                    <p>Aucun arrêt déterminé.</p>
                )}
            </div>
            <div>
                ⚫ Arrêts non déterminés:
                {posteData.arrets_non_determines?.length > 0 ? (
                    <ul>
                        {posteData.arrets_non_determines.map((arret) => {
                           const arretKey = arret.id || `${posteData.id}-non-determined-${new Date(arret.debut).getTime()}`;
                           return (
                            <li key={arretKey}>
                                <span onClick={() => handleArretNonDetermineClick(arret)} style={{ cursor: 'pointer', color: 'black' }}>
                                    {new Date(arret.debut).toLocaleTimeString()} - {new Date(arret.fin).toLocaleTimeString()} (Non déterminé)
                                </span>
                            </li>
                        )})}
                    </ul>
                ) : (
                    <p>Aucun arrêt non déterminé.</p>
                )}
            </div>
        </div>
    );
    }

    return (
        <ThemeProvider theme={theme}>
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Formulaire de Fin de Poste Camion
                </Typography>

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                    Activité des véhicules (Camions)
                </Typography>
                {loadingActivite ? (
                    <CircularProgress />
                ) : errorActivite ? (
                    <Alert severity="error">{errorActivite}</Alert>
                ) : (
                    activiteVehicules.map(vehiculeData => (
                        <Box key={vehiculeData.vehicule} sx={{ border: '1px solid #ccc', p: 2, mb: 2, borderRadius: '8px' }}>
                            <Typography variant="subtitle1" fontWeight="bold">Véhicule: {vehiculeData.vehicule}</Typography>
                            {vehiculeData.postes?.map(posteData => renderPosteActivite(posteData))}
                        </Box>
                    ))
                )}

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Formulaire de Fin de Poste
                </Typography>
                {enregistrementStatus && <Alert severity={enregistrementStatus.startsWith('Succès') ? 'success' : 'info'} sx={{ mb: 2 }}>{enregistrementStatus}</Alert>}
                {errorMessage && <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert>}
                <form onSubmit={handleSubmitFinPoste}>
                    <input type="hidden" name="type_vehicule" value={formData.type_vehicule} />

                    <Grid container spacing={2}>
                        <
// @ts-ignore
                        Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel id="vehicule-label">Véhicule</InputLabel>
                                <Select
                                    labelId="vehicule-label"
                                    id="vehicule"
                                    name="vehicule"
                                    value={formData.vehicule}
                                    onChange={handleChange}
                                    label="Véhicule"
                                >
                                    <MenuItem value="">Sélectionner un véhicule</MenuItem>
                                    {loadingVehicules ? (
                                        <MenuItem disabled>Chargement des véhicules...</MenuItem>
                                    ) : errorVehicules ? (
                                        <
// @ts-ignore
                                        MenuItem disabled error>{errorVehicules}</MenuItem>
                                    ) : (
                                        vehiculesDisponibles.map(vehicule => (
                                            <MenuItem key={vehicule.id} value={vehicule.type_vehicule}>{vehicule.modele}</MenuItem>
                                        ))
                                    )}
                                </Select>
                            </FormControl>
                        </Grid>
                        <
// @ts-ignore
                        Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Prénom"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <
// @ts-ignore
                        Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Nom"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <
// @ts-ignore
                        Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Téléphone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <
// @ts-ignore
                        Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Date du poste"
                                type="date"
                                name="date_poste"
                                value={formData.date_poste}
                                onChange={handleChange}
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <
// @ts-ignore
                        Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Heure de début"
                                type="time"
                                name="heure_debut"
                                value={formData.heure_debut}
                                onChange={handleChange}
                            />
                        </Grid>
                        <
// @ts-ignore
                        Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Heure de fin"
                                type="time"
                                name="heure_fin"
                                value={formData.heure_fin}
                                onChange={handleChange}
                            />
                        </Grid>
                        <
// @ts-ignore
                        Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Heure de fin du compteur"
                                type="number"
                                name="heure_de_fin_du_conteur"
                                value={formData.heure_de_fin_du_conteur}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <
// @ts-ignore
                        Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Commentaire"
                                name="commentaire"
                                value={formData.commentaire}
                                onChange={handleChange}
                                multiline={true}
                                rows={3}
                            />
                        </Grid>
                        <
// @ts-ignore
                        Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel id="poste-label">Poste</InputLabel>
                                <Select
                                    labelId="poste-label"
                                    id="poste"
                                    name="poste"
                                    value={formData.poste}
                                    onChange={handleChange}
                                    label="Poste"
                                >
                                    <MenuItem value="">Sélectionner un poste</MenuItem>
                                    {postesDisponibles.map((poste) => (
                                        <MenuItem key={poste} value={poste}>{poste}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <
// @ts-ignore
                        Grid item xs={12}>
                            <Button type="submit" variant="contained" color="primary">
                                Enregistrer la fin de poste
                            </Button>
                        </Grid>
                    </Grid>
                </form>

                <Divider sx={{ my: 3 }} />

                {selectedArretNonDetermine && (
                    <Box sx={{ mt: 3, p: 2, border: '1px solid orange', borderRadius: '8px' }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'orange' }}>
                            Signaler une cause pour l'arrêt non déterminé
                        </Typography>
                        <Typography variant="subtitle1" gutterBottom>
                            Arrêt du: {new Date(selectedArretNonDetermine.debut).toLocaleTimeString()} au {new Date(selectedArretNonDetermine.fin).toLocaleTimeString()}
                        </Typography>
                        {submissionPanneStatus && <Alert severity={submissionPanneStatus.startsWith('Succès') ? 'success' : 'info'} sx={{ mb: 2 }}>{submissionPanneStatus}</Alert>}
                        {errorMessagePanne && <Alert severity="error" sx={{ mb: 2 }}>{errorMessagePanne}</Alert>}
                        <form onSubmit={handleSubmitPanne}>
                            <FormControl component="fieldset" sx={{ mt: 2, mb: 2 }}>
                                <Typography variant="subtitle2">Pannes connues</Typography>
                                <Grid container spacing={1}>
                                    {pannesConues.map((panne) => (
                                        <
// @ts-ignore
                                        Grid item xs={12} sm={6} md={4} key={panne.id}>
                                            <FormControlLabel
                                                control={<input type="checkbox" value={panne.id} checked={selectedPannes.includes(panne.id)} onChange={handlePanneCheckboxChange} />}
                                                label={panne.nom}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </FormControl>
                            <TextField
                                fullWidth
                                label="Autre panne (personnalisée)"
                                value={pannePersonnalisee}
                                onChange={handlePannePersonnaliseeChange}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                fullWidth
                                label="Description de la panne"
                                multiline
                                rows={3}
                                value={descriptionPanne}
                                onChange={handleDescriptionPanneChange}
                                sx={{ mb: 2 }}
                            />
                            <Button type="submit" variant="contained" color="warning" disabled={submissionPanneStatus === 'Envoi en cours...'}>
                                Enregistrer la cause de l'arrêt
                                {submissionPanneStatus === 'Envoi en cours...' && <CircularProgress size={24} sx={{ ml: 1 }} />}
                            </Button>
                            <Button onClick={handleClosePanneForm} sx={{ ml: 2 }}>
                                Annuler
                            </Button>
                        </form>
                    </Box>
                )}

                <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                    <Alert onClose={handleCloseSnackbar} 
// @ts-ignore
                    severity={snackbarSeverity} sx={{ width: '100%' }}>
                        {snackbarMessage}
                    </Alert>
                </Snackbar>
            </Box>
        </ThemeProvider>
    );
};

export default PermanencierCamionFormulaireFin;
