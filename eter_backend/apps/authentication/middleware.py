"""
Middleware personnalisé pour la gestion CSRF avec authentification httpOnly
"""
from django.middleware.csrf import CsrfViewMiddleware
from django.urls import reverse
import re


class FlexibleCSRFMiddleware(CsrfViewMiddleware):
    """
    Middleware CSRF flexible qui permet l'exemption du login initial
    mais applique CSRF pour toutes les autres requêtes authentifiées
    """
    
    # URLs exemptées de CSRF (pour le login initial uniquement)
    EXEMPT_URLS = [
        r'^/api/auth/login/$',
        r'^/api/auth/session/csrf/$',
    ]
    
    def process_view(self, request, callback, callback_args, callback_kwargs):
        """
        Vérifier si l'URL est exemptée avant d'appliquer CSRF
        """
        # Vérifier si l'URL est dans la liste d'exemption
        path = request.path_info
        
        for exempt_url in self.EXEMPT_URLS:
            if re.match(exempt_url, path):
                # Exempter cette URL de CSRF
                return None
        
        # Pour toutes les autres URLs, appliquer CSRF normalement
        return super().process_view(request, callback, callback_args, callback_kwargs)