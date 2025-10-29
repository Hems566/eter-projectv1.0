from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'core'

# Router pour les ViewSets
router = DefaultRouter()
router.register(r'fournisseurs', views.FournisseurViewSet)
router.register(r'demandes-location', views.DemandeLocationViewSet, basename='demandelocation')
router.register(r'materiels-location', views.MaterielLocationViewSet, basename='materiellocation')
router.register(r'mises-a-disposition', views.MiseADispositionViewSet, basename='miseadisposition')
router.register(r'engagements', views.EngagementViewSet, basename='engagement')
router.register(r'fiches-pointage', views.FichePointageMaterielViewSet, basename='fichespointage')
router.register(r'pointages-journaliers', views.PointageJournalierViewSet, basename='pointagejournalier')
router.register(r'verification-pointage', views.FicheVerificationPointageViewSet, basename='verificationpointage')
# router.register(r'archives-pointage', views.PointageArchiveViewSet, basename='pointagearchive')

urlpatterns = [
    # URLs du router
    path('', include(router.urls)),
    # path('', api.fournisseurs_list)
    
    # Endpoints pour les statistiques
    path('statistiques/', views.statistiques_dashboard, name='statistiques'),
    path('dashboard/stats/', views.statistiques_dashboard, name='dashboard_stats'),  # Alias pour compatibilité frontend
    
]