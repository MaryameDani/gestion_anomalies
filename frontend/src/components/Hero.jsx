"use client";
import { Box, Container, Typography, Button, Grid } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate } from "react-router-dom";
export default function Hero() {
  const navigate = useNavigate();
  return (
    <Box
      id="accueil"
      sx={{
        bgcolor: "background.paper",
        pt: { xs: 8, md: 12 },
        pb: { xs: 8, md: 12 },
        overflow: "hidden",
      }}
    >
      <Container maxWidth="lg">
        <Grid
          container
          spacing={4}
          alignItems="center"
          justifyContent="center" // Center the content horizontally
          direction="column" // Stack items vertically
          textAlign="center" // Center text horizontally
        >
          {/* Texte à gauche (now centered) */}
          <Grid item xs={12}>
            <Box
              sx={{
                maxWidth: "600px",
                mx: "auto",
                opacity: 1,
                transform: "translateY(0)",
                transition: "opacity 0.8s ease-out, transform 0.8s ease-out",
              }}
            >
              <Typography component="h1" variant="h2" color="primary.main" gutterBottom sx={{ fontWeight: 700 }}>
                Prédisez et améliorez les performances académiques
              </Typography>

              <Typography variant="h5" color="text.secondary" paragraph sx={{ mb: 4 }}>
                EduPredict utilise l'intelligence artificielle pour analyser, classifier et prédire les performances
                des étudiants, permettant aux établissements d'intervenir au bon moment et d'optimiser les parcours
                d'apprentissage.
              </Typography>

              <Button variant="contained" color="primary" size="large"onClick={() => navigate("/login")}  endIcon={<ArrowForwardIcon />} sx={{ px: 4, py: 1.5 }}>
                Commencer
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
