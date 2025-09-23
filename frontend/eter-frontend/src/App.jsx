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
import PointagesList from './pages/pointages/PointagesList';
import FichePointageDetail from './pages/pointages/FichePointageDetail';
import EngagementCreate from './pages/engagements/EngagementCreate';
import DemandeEdit from './pages/demandes/DemandeEdit';
import FichePointageCreate from './pages/pointages/FichePointageCreate';
import RapportsPointage from './pages/pointages/RapportPointage';
import PointageJournalierForm from './pages/pointages/PointageJournalierForm';
import PointageJournalierDetail from './pages/pointages/PointageJournalierDetail';
import MiseADispositionsList from './pages/mise-a-disposition/MiseADispositionList';
import MiseADispositionCreate from './pages/mise-a-disposition/MiseADispositionCreate';
import ProtectedRoute from './components/common/protectedRoute';
import DemandesEnAttenteValidation from './pages/demandes/DemandesEnAttenteValidation';
import MiseADispositionDetail from './pages/mise-a-disposition/MiseADispositionDetail';
import MiseADispositionSelectDemande from './pages/mise-a-disposition/MiseADispositionSelectDemande';
import PointageJournalierCreate from './pages/pointages/PointageJournalierCreate';
import './styles/globals.css';

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
          path="/engagements/:id" 
          element={
            <ProtectedRoute resource="engagements">
              <EngagementDetail />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/engagements/create" 
          element={
            <ProtectedRoute resource="engagements" action="create">
              <EngagementCreate />
            </ProtectedRoute>
          } 
        />

        {/* Routes des pointages */}
        <Route 
          path="/pointages/*" 
          element={
            <ProtectedRoute resource="pointages">
              <Routes>
                <Route path="/" element={<PointagesList />} />
                <Route path="/fiches" element={<PointagesList />} />
                <Route path="/fiches/:id" element={<FichePointageDetail />} />
                <Route path="/rapports" element={<RapportsPointage />} />
               <Route path="/journaliers/:id" element={<PointageJournalierDetail />} />
               <Route path="/journaliers/:id/edit" element={<PointageJournalierForm />} />
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
        

        {/* Route par défaut */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
