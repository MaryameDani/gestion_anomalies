"use client"
import { Box, Container, Typography, Grid, Card, CardContent, useTheme } from "@mui/material"
import PeopleIcon from "@mui/icons-material/People"
import CategoryIcon from "@mui/icons-material/Category"
import TrendingUpIcon from "@mui/icons-material/TrendingUp"
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive"
import RouteIcon from "@mui/icons-material/Route"

const features = [
  {
    title: "Gestion des étudiants",
    description: "Suivez les notes, comportements et activités de vos étudiants en temps réel.",
    icon: <PeopleIcon sx={{ fontSize: 60 }} />,
  },
  {
    title: "Classification des performances",
    description: "Catégorisez les étudiants selon leurs performances pour mieux adapter votre enseignement.",
    icon: <CategoryIcon sx={{ fontSize: 60 }} />,
  },
  {
    title: "Prédiction des performances",
    description: "Anticipez les résultats futurs grâce à nos algorithmes d'apprentissage automatique.",
    icon: <TrendingUpIcon sx={{ fontSize: 60 }} />,
  },
  {
    title: "Alertes préventives",
    description: "Recevez des notifications pour les étudiants à risque d'échec avant qu'il ne soit trop tard.",
    icon: <NotificationsActiveIcon sx={{ fontSize: 60 }} />,
  },
  {
    title: "Recommandations personnalisées",
    description: "Obtenez des suggestions de parcours académiques adaptés à chaque profil d'étudiant.",
    icon: <RouteIcon sx={{ fontSize: 60 }} />,
  },
]

export default function Features() {
  const theme = useTheme()

  return (
    <Box
      id="fonctionnalités"
      sx={{
        bgcolor: theme.palette.grey[50],
        py: { xs: 8, md: 12 },
      }}
    >
      <Container maxWidth="lg">
        <Typography
          component="h2"
          variant="h3"
          align="center"
          color="text.primary"
          gutterBottom
        >
          Fonctionnalités principales
        </Typography>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item key={index} xs={12} sm={6} md={4}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "16px",
                  boxShadow: "0 5px 15px rgba(0, 0, 0, 0.08)",
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    display: "flex",
                    justifyContent: "center",
                    color: "primary.main",
                  }}
                >
                  {feature.icon}
                </Box>
                <CardContent sx={{ flexGrow: 1, textAlign: "center" }}>
                  <Typography gutterBottom variant="h5" component="h3" sx={{ fontWeight: 600 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}
