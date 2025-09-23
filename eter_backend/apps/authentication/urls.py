from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views, session_views

app_name = 'authentication'

urlpatterns = [
    # ========================================
    # ENDPOINTS PRINCIPAUX - httpOnly Cookies
    # ========================================
    # Le frontend utilise ces endpoints (sans préfixe session/)
    path('login/', session_views.SessionLoginView.as_view(), name='secure_login'),
    path('logout/', session_views.SessionLogoutView.as_view(), name='secure_logout'),
    path('status/', session_views.session_status, name='secure_status'),
    path('refresh/', session_views.SessionRefreshView.as_view(), name='secure_refresh'),
    
    # ========================================
    # GESTION DES UTILISATEURS
    # ========================================
    path('register/', views.UserRegistrationView.as_view(), name='register'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('password/change/', views.PasswordChangeView.as_view(), name='password_change'),
    
    # ========================================
    # INFORMATIONS UTILISATEUR
    # ========================================
    path('permissions/', views.user_permissions, name='permissions'),
    path('users/', views.users_list, name='users_list'),
]