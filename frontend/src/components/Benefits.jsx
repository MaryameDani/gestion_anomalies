"use client"
import { useEffect, useRef } from "react"
import { Box, Container, Typography, Grid, Paper, useTheme } from "@mui/material"
import SchoolIcon from "@mui/icons-material/School"
import InsightsIcon from "@mui/icons-material/Insights"
import AccessTimeIcon from "@mui/icons-material/AccessTime"
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"

const benefits = [
  {
    title: "Amélioration des résultats",
    description: "Augmentez le taux de réussite de vos étudiants grâce à des interventions ciblées et précoces.",
    icon: <EmojiEventsIcon sx={{ fontSize: 50, color: "primary.main" }} />,
  },
  {
    title: "Gain de temps",
    description:
      "Automatisez l'analyse des performances et concentrez-vous sur l'enseignement plutôt que sur l'administration.",
    icon: <AccessTimeIcon sx={{ fontSize: 50, color: "primary.main" }} />,
  },
  {
    title: "Décisions basées sur les données",
    description:
      "Prenez des décisions pédagogiques éclairées grâce à des analyses précises et des visualisations claires.",
    icon: <InsightsIcon sx={{ fontSize: 50, color: "primary.main" }} />,
  },
  {
    title: "Adaptation à chaque établissement",
    description: "Notre solution s'adapte à tous types d'établissements, de la primaire à l'université.",
    icon: <SchoolIcon sx={{ fontSize: 50, color: "primary.main" }} />,
  },
]

export default function Benefits() {
  const theme = useTheme()
  const sectionRef = useRef(null)
  const titleRef = useRef(null)
  const descRef = useRef(null)
  const benefitsRef = useRef([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (titleRef.current) {
              titleRef.current.style.opacity = 1
              titleRef.current.style.transform = "translateY(0)"
            }

            if (descRef.current) {
              setTimeout(() => {
                if (descRef.current) {
                  descRef.current.style.opacity = 1
                  descRef.current.style.transform = "translateY(0)"
                }
              }, 300)
            }

            benefitsRef.current.forEach((benefit, index) => {
              setTimeout(
                () => {
                  if (benefit) {
                    benefit.style.opacity = 1
                    benefit.style.transform = "translateY(0)"
                  }
                },
                400 + 150 * index,
              )
            })

            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [])

  return (
    <Box
      id="avantages"
      ref={sectionRef}
      sx={{
        bgcolor: "background.paper",
        py: { xs: 8, md: 12 },
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 8 }}>
          <Typography
            ref={titleRef}
            component="h2"
            variant="h3"
            color="text.primary"
            gutterBottom
            sx={{
              opacity: 0,
              transform: "translateY(20px)",
              transition: "opacity 0.8s ease-in-out, transform 0.8s ease-in-out",
            }}
          >
            Pourquoi choisir EduPredict ?
          </Typography>
          <Typography
            ref={descRef}
            variant="h6"
            color="text.secondary"
            sx={{
              maxWidth: 800,
              mx: "auto",
              opacity: 0,
              transform: "translateY(20px)",
              transition: "opacity 0.8s ease-in-out, transform 0.8s ease-in-out",
            }}
          >
            Notre plateforme offre aux établissements scolaires et aux enseignants des outils puissants pour transformer
            l'éducation.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {benefits.map((benefit, index) => (
            <Grid item key={index} xs={12} md={6}>
              <Paper
                ref={(el) => {
                  benefitsRef.current[index] = el;
                }}
                elevation={2}
                sx={{
                  p: 4,
                  height: "100%",
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "center", sm: "flex-start" },
                  textAlign: { xs: "center", sm: "left" },
                  borderRadius: "16px",
                  opacity: 0,
                  transform: "translateY(30px)",
                  transition: "opacity 0.8s ease-in-out, transform 0.8s ease-in-out, box-shadow 0.3s ease-in-out",
                  "&:hover": {
                    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.1)",
                  },
                }}
              >
                <Box sx={{ mr: { sm: 3 }, mb: { xs: 2, sm: 0 }, display: "flex", justifyContent: "center" }}>
                  {benefit.icon}
                </Box>
                <Box>
                  <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                    {benefit.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {benefit.description}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}

