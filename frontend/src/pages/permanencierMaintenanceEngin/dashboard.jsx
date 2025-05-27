import React, { useEffect, useState } from "react";
import {
  ThemeProvider,
  createTheme,
  Container,
  Typography,
  CircularProgress,
  Box,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";
import axios from "axios";

const theme = createTheme({
  palette: {
    primary: {
      main: "#B7CE66",
    },
  },
});

const api = axios.create({
  baseURL: "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const MaintenanceEnginDashboard = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("api/situation_parc/");
      setData(response.data);
    } catch (err) {
      console.error("Erreur API:", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 4 }}>
          <Typography variant="h4"> SITUATION DU PARC OPERATIONNEL MEA 
</Typography>
          <Button variant="contained" onClick={fetchData} disabled={loading}>
            Actualiser
          </Button>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          Object.entries(data).map(([categorie, section]) => (
            <Box key={categorie} sx={{ mb: 5 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>
                {section.title}
              </Typography>

              {section.data.length === 0 ? (
                <Alert severity="success">Aucun engin en panne</Alert>
              ) : (
                <TableContainer component={Paper} sx={{ mb: 4 }}>
                  <Table>
                    <TableHead>
  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
    <TableCell>Modèle</TableCell>
    <TableCell>Nombre d'anomalies</TableCell>
    <TableCell>Gravité</TableCell>
    <TableCell>Détails des anomalies</TableCell>
  </TableRow>
</TableHead>
<TableBody>
  {section.data.map((vehicule, index) => (
    <TableRow key={index} hover>
      <TableCell>{vehicule.modele}</TableCell>
      <TableCell>
        <Chip
          label={`${vehicule.causes.split(",").filter(c => c.trim()).length} anomalie(s)`}
          color="error"
          size="small"
        />
      </TableCell>
      <TableCell>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {(vehicule.gravites || []).map((gravite, i) => (
            <Chip
              key={i}
              label={gravite}
              size="small"
              color={
                gravite.toLowerCase().includes("élevée")
                  ? "error"
                  : gravite.toLowerCase().includes("moyenne")
                  ? "warning"
                  : "success"
              }
            />
          ))}
        </Box>
      </TableCell>
      <TableCell>
        <Box
          sx={{
            maxHeight: "120px",
            overflow: "auto",
            pl: 1,
            borderLeft: "2px solid #eee",
          }}
        >
          {vehicule.causes.split(",").map((cause, i) => (
            <Box key={i} sx={{ mb: 1 }}>
              • {cause.trim()}
            </Box>
          ))}
        </Box>
      </TableCell>
    </TableRow>
  ))}
</TableBody>


                  </Table>
                </TableContainer>
              )}
            </Box>
          ))
        )}
      </Container>
    </ThemeProvider>
  );
};

export default MaintenanceEnginDashboard;
