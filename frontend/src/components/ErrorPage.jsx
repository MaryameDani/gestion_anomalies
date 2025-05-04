import { useRouteError } from 'react-router-dom';
import { Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function ErrorPage({ message }) {
  const error = useRouteError();
  const navigate = useNavigate();
  console.error("Erreur de route :", error);

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        fontFamily: 'sans-serif',
        textAlign: 'center',
      }}
    >
      <Typography variant="h3" gutterBottom>
        Oops!
      </Typography>
      <Typography variant="subtitle1" color="error" gutterBottom>
        Une erreur inattendue s'est produite.
      </Typography>
      {message && (
        <Typography variant="body2" gutterBottom>
          <strong>Message :</strong> {message}
        </Typography>
      )}
      {error && error.
// @ts-ignore
      statusText && (
        <Typography variant="body2" gutterBottom>
          <strong>{error.
// @ts-ignore
          status}</strong> {error.statusText}
        </Typography>
      )}
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Veuillez réessayer plus tard ou contacter l'administrateur.
      </Typography>
      <Button variant="contained" color="primary" onClick={handleGoHome}>
        Retour à l'accueil
      </Button>
    </Box>
  );
}

export default ErrorPage;