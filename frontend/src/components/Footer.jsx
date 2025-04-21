"use client"
import { Box, Container, Typography} from "@mui/material"


export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "primary.main",
        color: "white",
        py: 6,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="body2" color="inherit">
            © {new Date().getFullYear()} EduPredict. Tous droits réservés.
          </Typography>
          <Typography variant="caption" color="inherit" sx={{ mt: 1, display: "block", opacity: 0.8 }}>
            Nous accordons une importance particulière à la protection et à la confidentialité de vos données.
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

