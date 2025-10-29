import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from 'antd';
import AppLayout from './components/common/Layout';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import DemandesList from './pages/demandes/DemandesList';
import DemandeDetail from './pages/demandes/DemandeDetail';
import DemandeCreate from './pages/demandes/DemandeCreate';
import { useAuthStore } from './store/authStore';
import EngagementDetail from './pages/engagements/EngagementDetail';
import EngagementsList from './pages/engagements/EngagementsList';
import FichePointageDetail from './pages/pointages/FichePointageDetail';
import EngagementCreate from './pages/engagements/EngagementCreate';
import DemandeEdit from './pages/demandes/DemandeEdit';
import FichePointageCreate from './pages/pointages/FichePointageCreate';
import RapportsPointage from './pages/pointages/RapportPointage';
import PointageJournalierDetail from './pages/pointages/PointageJournalierDetail';
import MiseADispositionsList from './pages/mise-a-disposition/MiseADispositionList';
import MiseADispositionCreate from './pages/mise-a-disposition/MiseADispositionCreate';
import ProtectedRoute from './components/common/ProtectedRoute';
import DemandesEnAttenteValidation from './pages/demandes/DemandesEnAttenteValidation';
import MiseADispositionDetail from './pages/mise-a-disposition/MiseADispositionDetail';
import MiseADispositionSelectDemande from './pages/mise-a-disposition/MiseADispositionSelectDemande';
import PointageJournalierCreate from './pages/pointages/PointageJournalierCreate';
import './styles/globals.css';
import FournisseursList from './pages/fournisseurs/FournisseursList';
import FournisseurForm from './components/forms/FournisseurForm';
import FournisseurDetail from './pages/fournisseurs/FournisseurDetail';
import MaterielsList from './pages/materiels/MaterielsList';
import MaterielForm from './components/forms/MaterielForm';
import MaterielDetail from './pages/materiels/MaterielDetail';
import EngagementForm from './components/forms/EngagmentForm';
import FichesPointageList from './pages/pointages/FichesPointageList';
import PointageJournalierEdit from './pages/pointages/PointageJournalierEdit';
import PointagesJournaliersList from './pages/pointages/PointagesJournaliersList';
import FichePointageEdit from './pages/pointages/FichePointageEdit';
import EngagementsExpirants from './pages/engagements/EngagementsExpirants';
import MiseADispositionEdit from './pages/mise-a-disposition/MiseADispositionEdit';
import EngagementEdit from './pages/engagements/EngagmentEdit';

function App() {
  const { user, isAuthenticated, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        
        {/* Routes des demandes */}
        <Route 
          path="/demandes" 
          element={
            <ProtectedRoute resource="demandes">
              <DemandesList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/demandes/create" 
          element={
            <ProtectedRoute resource="demandes" action="create">
              <DemandeCreate />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/demandes/en-attente-validation" 
          element={
            <ProtectedRoute resource="demandes" action="validate">
              <DemandesEnAttenteValidation />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/demandes/:id" 
          element={
            <ProtectedRoute resource="demandes">
              <DemandeDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/demandes/:id/edit" 
          element={
            <ProtectedRoute resource="demandes" action="edit">
              <DemandeEdit />
            </ProtectedRoute>
          } 
        />

        {/* Routes des mises à disposition */}
        <Route 
          path="/mises-a-disposition" 
          element={
            <ProtectedRoute resource="mises-a-disposition">
              <MiseADispositionsList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/mises-a-disposition/select-demande"  
          element={
            <ProtectedRoute resource="mises-a-disposition">
              <MiseADispositionSelectDemande />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/mises-a-disposition/create" 
          element={
            <ProtectedRoute resource="mises-a-disposition" action="create">
              <MiseADispositionCreate />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/mises-a-disposition/:id" 
          element={
            <ProtectedRoute resource="mises-a-disposition">
              <MiseADispositionDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/mises-a-disposition/:id/edit" 
          element={
            <ProtectedRoute resource="mises-a-disposition">
              <MiseADispositionEdit />
            </ProtectedRoute>
          } 
        />

        {/* Routes des engagements */}
        <Route 
          path="/engagements" 
          element={
            <ProtectedRoute resource="engagements">
              <EngagementsList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/engagements/expirants" 
          element={
            <ProtectedRoute resource="engagements">
              <EngagementsExpirants />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/engagements/:id" 
          element={
            <ProtectedRoute resource="engagements">
              <EngagementDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/engagements/:id/edit" 
          element={
            <ProtectedRoute resource="engagements">
              <EngagementEdit />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/engagements/create" 
          element={
            <ProtectedRoute resource="engagements" action="create">
              <EngagementForm />
            </ProtectedRoute>
          } 
        />

        {/* Routes des pointages */}
        <Route 
          path="/pointages/*" 
          element={
            <ProtectedRoute resource="pointages">
              <Routes>
                <Route path="/fiches" element={<FichesPointageList />} />
                <Route path="/fiches/:id" element={<FichePointageDetail />} />
                <Route path="/fiches/:id/edit" element={<FichePointageEdit />} />
                <Route path="/rapports" element={<RapportsPointage />} />
               <Route path="/journaliers/" element={<PointagesJournaliersList />} />
               <Route path="/journaliers/:id" element={<PointageJournalierDetail />} />
               <Route path="/journaliers/:id/edit" element={<PointageJournalierEdit />} />
              </Routes>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/pointages/fiches/create" 
          element={
            <ProtectedRoute resource="pointages" action="create">
              <FichePointageCreate />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/pointages/journaliers/create" 
          element={
            <ProtectedRoute resource="pointages" action="create">
              <PointageJournalierCreate />
            </ProtectedRoute>
          } 
        />

        {/* Routes des fournisseurs */}
        <Route 
          path="/fournisseurs" 
          element={
            <ProtectedRoute resource="fournisseurs">
              <FournisseursList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/fournisseurs/create" 
          element={
            <ProtectedRoute resource="fournisseurs" action="create">
              <FournisseurForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/fournisseurs/:id" 
          element={
            <ProtectedRoute resource="fournisseurs">
              <FournisseurDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/fournisseurs/:id/edit" 
          element={
            <ProtectedRoute resource="fournisseurs" action="edit">
              <FournisseurForm />
            </ProtectedRoute>
          } 
        />

        {/* Routes des matériels */}
        <Route 
          path="/materiels" 
          element={
            <ProtectedRoute resource="materiels">
              <MaterielsList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/materiels/create" 
          element={
            <ProtectedRoute resource="materiels" action="create">
              <MaterielForm />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/materiels/:id" 
          element={
            <ProtectedRoute resource="materiels">
              <MaterielDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/materiels/:id/edit" 
          element={
            <ProtectedRoute resource="materiels" action="edit">
              <MaterielForm />
            </ProtectedRoute>
          } 
        />
        

        {/* Route par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
