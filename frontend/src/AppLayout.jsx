import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import DashboardLayout from "./DashboardLayout";
import LoginForm from "./pages/LoginForm";
import ErrorPage from "./components/ErrorPage";
import { isAuthenticated, getUserRole, checkAuthStatus } from "./utils/auth";

// Admin Pages
import AdminDashboard from "./pages/admin/dashboard";
import Historiques from "./pages/admin/historiques";
import GenererRapport from "./pages/admin/genererRapport";
import RapportsSauvegardes from "./pages/admin/rapportsSauvegardes";
import Classement from "./pages/admin/classment";
import PredictTonnage from "./pages/admin/predictTonnage";

// Permanencier Camion Pages
import PermanencierCamionDashboard from "./pages/permanencierCamion/dashboard";
import PermanencierCamionTicket from "./pages/permanencierCamion/ticket";
import PermanencierCamionFin from "./pages/permanencierCamion/formulaireFin";

// Permanencier Machine Pages
import PermanencierMachineDashboard from "./pages/permanencierMachine/dashboard";
import PermanencierMachineTicket from "./pages/permanencierMachine/ticket";
import PermanencierMachineFormulaireFin from "./pages/permanencierMachine/formulaireFin";

// Maintenance Dragline Pages
import MaintenanceDraglineDashboard from "./pages/permanencierMaintenanceDragline/dashboard";
import MaintenanceDraglineSuperviser from "./pages/permanencierMaintenanceDragline/superviserAnomalies";

// Maintenance Engin Pages
import MaintenanceEnginDashboard from "./pages/permanencierMaintenanceEngin/dashboard";
import MaintenanceEnginSuperviser from "./pages/permanencierMaintenanceEngin/superviserAnomalies";

// Maintenancier Pages
import MaintenancierDashboard from "./pages/Maintenancier/dashboard";
import MaintenancierSuperviser from "./pages/Maintenancier/superviserAnomalies";

// Component de route protégée utilisant Navigate
const ProtectedRoute = ({ children, requiredRole }) => {
  const authenticated = isAuthenticated();
  const userRole = getUserRole();
  const location = useLocation();
  
  // Si non authentifié, rediriger vers login
  if (!authenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  
  // Si pas le bon rôle, rediriger vers login
  if (userRole !== requiredRole) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  
  return children;
};

// Composant pour rediriger vers le dashboard approprié après connexion
const RootRedirect = () => {
  const authenticated = isAuthenticated();
  
  // Vérifier l'état d'authentification au chargement
  useEffect(() => {
    const verifyAuth = async () => {
      if (authenticated) {
        await checkAuthStatus();
      }
    };
    
    verifyAuth();
  }, [authenticated]);
  
  // Si l'utilisateur n'est pas connecté, afficher la page de login
  if (!authenticated) {
    return <LoginForm />;
  }
  
  // Sinon, rediriger vers le dashboard approprié selon le rôle
  const role = getUserRole();
  
  switch (role) {
    case "admin":
      return <Navigate to="/admin/dashboard" replace />;
    case "permanencierCamion":
      return <Navigate to="/permanencierCamion/dashboard" replace />;
    case "permanencierMachine":
      return <Navigate to="/permanencierMachine/dashboard" replace />;
    case "permanencierMaintenanceDragline":
      return <Navigate to="/permanencierMaintenanceDragline/dashboard" replace />;
    case "permanencierMaintenanceEngin":
      return <Navigate to="/permanencierMaintenanceEngin/dashboard" replace />;
    case "Maintenancier":
      return <Navigate to="/Maintenancier/dashboard" replace />;
    default:
      // Si rôle non reconnu, déconnecter et afficher login
      return <LoginForm />;
  }
};

const AppLayout = () => {
  return (
    <Routes>
      {/* Route racine - Affiche login ou redirige vers le dashboard approprié */}
      <Route path="/" element={<RootRedirect />} errorElement={<ErrorPage message="Erreur sur la page principale" />} />
      
      {/* Routes Admin */}
      <Route 
        path="/admin"
        element={<ProtectedRoute requiredRole="admin"><DashboardLayout role="admin" /></ProtectedRoute>}
        errorElement={<ErrorPage message="Erreur dans la section Admin" />}
      >
        <Route path="dashboard" element={<AdminDashboard />} errorElement={<ErrorPage message="Erreur sur le tableau de bord Admin" />} />
        <Route path="historiques" element={<Historiques />} errorElement={<ErrorPage message="Erreur sur les historiques" />} />
        <Route path="genererRapport" element={<GenererRapport />} errorElement={<ErrorPage message="Erreur lors de la génération de rapport" />} />
        <Route path="rapportsSauvegardes" element={<RapportsSauvegardes />} errorElement={<ErrorPage message="Erreur sur les rapports sauvegardés" />} />
        <Route path="classment" element={<Classement />} errorElement={<ErrorPage message="Erreur sur le classement" />} />
        <Route path="PredictTonnage" element={<PredictTonnage />} errorElement={<ErrorPage message="Erreur sur la prédiction de tonnage" />} />
      </Route>

      {/* Routes Permanencier Camion */}
      <Route
        path="/permanencierCamion"
        element={<ProtectedRoute requiredRole="permanencierCamion"><DashboardLayout role="permanencierCamion" /></ProtectedRoute>}
        errorElement={<ErrorPage message="Erreur dans la section Permanencier Camion" />}
      >
        <Route path="dashboard" element={<PermanencierCamionDashboard />} errorElement={<ErrorPage message="Erreur sur le tableau de bord Permanencier Camion" />} />
        <Route path="ticket" element={<PermanencierCamionTicket />} errorElement={<ErrorPage message="Erreur lors de la déclaration (Camion)" />} />
        <Route path="formulaireFin" element={<PermanencierCamionFin />} errorElement={<ErrorPage message="Erreur sur le formulaire de fin (Camion)" />} />
      </Route>

      {/* Routes Permanencier Machine */}
      <Route
        path="/permanencierMachine"
        element={<ProtectedRoute requiredRole="permanencierMachine"><DashboardLayout role="permanencierMachine" /></ProtectedRoute>}
        errorElement={<ErrorPage message="Erreur dans la section Permanencier Machine" />}
      >
        <Route path="dashboard" element={<PermanencierMachineDashboard />} errorElement={<ErrorPage message="Erreur sur le tableau de bord Permanencier Machine" />} />
        <Route path="ticket" element={<PermanencierMachineTicket />} errorElement={<ErrorPage message="Erreur lors de la déclaration (Machine)" />} />
        <Route path="formulaireFin" element={<PermanencierMachineFormulaireFin />} errorElement={<ErrorPage message="Erreur sur le formulaire de fin (Machine)" />} />
      </Route>

      {/* Routes permanencierMaintenanceDragline */}
      <Route
        path="/permanencierMaintenanceDragline"
        element={<ProtectedRoute requiredRole="permanencierMaintenanceDragline"><DashboardLayout role="permanencierMaintenanceDragline" /></ProtectedRoute>}
        errorElement={<ErrorPage message="Erreur dans la section Maintenance Dragline" />}
      >
        <Route path="dashboard" element={<MaintenanceDraglineDashboard />} errorElement={<ErrorPage message="Erreur sur le tableau de bord Maintenance Dragline" />} />
        <Route path="SuperviserAnomalies" element={<MaintenanceDraglineSuperviser />} errorElement={<ErrorPage message="Erreur lors de la supervision des anomalies (Dragline)" />} />
      </Route>

      {/* Routes permanencierMaintenanceEngin */}
      <Route
        path="/permanencierMaintenanceEngin"
        element={<ProtectedRoute requiredRole="permanencierMaintenanceEngin"><DashboardLayout role="permanencierMaintenanceEngin" /></ProtectedRoute>}
        errorElement={<ErrorPage message="Erreur dans la section Maintenance Engin" />}
      >
        <Route path="dashboard" element={<MaintenanceEnginDashboard />} errorElement={<ErrorPage message="Erreur sur le tableau de bord Maintenance Engin" />} />
        <Route path="SuperviserAnomalies" element={<MaintenanceEnginSuperviser />} errorElement={<ErrorPage message="Erreur lors de la supervision des anomalies (Engin)" />} />
      </Route>

      {/* Routes Maintenancier */}
      <Route
        path="/Maintenancier"
        element={<ProtectedRoute requiredRole="Maintenancier"><DashboardLayout role="Maintenancier" /></ProtectedRoute>}
        errorElement={<ErrorPage message="Erreur dans la section Maintenancier" />}
      >
        <Route path="dashboard" element={<MaintenancierDashboard />} errorElement={<ErrorPage message="Erreur sur le tableau de bord Maintenancier" />} />
        <Route path="SuperviserAnomalies" element={<MaintenancierSuperviser />} errorElement={<ErrorPage message="Erreur lors de la supervision des anomalies (Maintenancier)" />} />
      </Route>

      {/* Redirection pour les chemins inconnus vers la page racine */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppLayout;