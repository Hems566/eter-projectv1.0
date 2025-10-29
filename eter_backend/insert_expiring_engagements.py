import os
import django
from datetime import date, timedelta
import random

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eter_backend.settings')
django.setup()

from apps.core.models import Engagement, MiseADisposition, Fournisseur

def create_expiring_engagements():
    """
    Crée des engagements qui expirent bientôt pour les tests
    """

    # Engagements expirant dans 5 jours
    expiring_soon = [
        {'days': 5, 'count': 2},
        {'days': 3, 'count': 1},
        {'days': 1, 'count': 1},
    ]

    # Engagements déjà expirés
    expired = [
        {'days': -1, 'count': 1},
        {'days': -5, 'count': 1},
        {'days': -10, 'count': 1},
    ]

    created_count = 0

    # Récupère une mise à disposition existante ou crée une temporaire
    mise_disposition = MiseADisposition.objects.filter(demande_location__statut='ENGAGEMENT_CREE').first()

    if not mise_disposition:
        print("Aucune mise à disposition avec statut ENGAGEMENT_CREE trouvée. Création d'une mise à disposition temporaire...")

        # Récupère ou crée un fournisseur
        fournisseur = Fournisseur.objects.filter(actif=True).first()
        if not fournisseur:
            fournisseur = Fournisseur.objects.create(
                nif='12345678',
                raison_sociale='Fournisseur Test Expire',
                telephone='123456789',
                adresse='Test Address',
                email='test@example.com',
                actif=True
            )

        # Crée une DL temporaire (simplifiée)
        dl = DemandeLocation.objects.create(
            numero='DL-TEST-EXP-01',
            demandeur=User.objects.filter(is_superuser=True).first(),
            departement='TEST',
            chantier='Chantier Test Expiration',
            duree_mois=2,
            statut='MISE_A_DISPOSITION'
        )

        mise_disposition = MiseADisposition.objects.create(
            demande_location=dl,
            fournisseur=fournisseur,
            date_mise_disposition=date.today(),
            immatriculation='TEST-EXP-001',
            conforme=True,
            responsable=User.objects.filter(is_superuser=True).first()
        )

    # Crée les engagements expirant bientôt
    for exp in expiring_soon + expired:
        for i in range(exp['count']):
            date_fin = date.today() + timedelta(days=exp['days'])

            # Calcule la date de début basée sur la durée (2 mois)
            date_debut = date_fin - timedelta(days=60)  # 2 mois approximativement

            engagement = Engagement.objects.create(
                mise_a_disposition=mise_disposition,
                numero=f'CTL-TEST-EXP-{created_count + 1:03d}',
                date_debut=date_debut,
                date_fin=date_fin,
                conditions_particulieres=f'Engagement de test expirant dans {exp["days"]} jours',
                responsable=User.objects.filter(is_superuser=True).first()
            )

            print(f"Créé engagement {engagement.numero} - Expire le {engagement.date_fin} (dans {exp['days']} jours)")
            created_count += 1

    print(f"\nTotal d'engagements créés: {created_count}")
    print("Engagements expirant bientôt:")
    soon = Engagement.objects.filter(date_fin__lte=date.today() + timedelta(days=10), date_fin__gte=date.today())
    for eng in soon:
        print(f"  - {eng.numero}: expire dans {eng.jours_restants} jours")

    print("\nEngagements déjà expirés:")
    expired_eng = Engagement.objects.filter(date_fin__lt=date.today())
    for eng in expired_eng:
        print(f"  - {eng.numero}: expiré depuis {-eng.jours_restants} jours")

if __name__ == '__main__':
    from django.contrib.auth.models import User
    from apps.core.models import DemandeLocation

    create_expiring_engagements()