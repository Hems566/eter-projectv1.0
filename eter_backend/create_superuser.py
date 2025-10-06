#!/usr/bin/env python
"""
Script pour créer un superuser ETER pour les tests
"""
import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eter_backend.settings')
django.setup()

from apps.authentication.models import CustomUser

def create_admin_user():
    """
    Créer un utilisateur administrateur pour les tests
    """
    username = 'admin'
    email = 'mohamedozilw@gmail.com'
    password = 'eter'
    
    # Vérifier si l'utilisateur existe déjà
    if CustomUser.objects.filter(username=username).exists():
        print(f"L'utilisateur {username} existe déjà.")
        return
    
    # Créer l'utilisateur admin
    user = CustomUser.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name='Administrateur',
        last_name='ETER',
        role='ADMIN',
        is_staff=True,
        is_superuser=True
    )
    
    print(f"Superuser créé avec succès:")
    print(f"  Username: {username}")
    print(f"  Email: {email}")
    print(f"  Password: {password}")
    print(f"  Role: {user.role}")

def create_test_users():
    """
    Créer des utilisateurs de test pour chaque rôle
    """
    test_users = [
        {
            'username': 'd_dtx',
            'email': 'fst44588@gmail.com',
            'password': 'eter',
            'first_name': 'Ahmed',
            'last_name': 'Bennani',
            'role': 'DEMANDEUR',
            'departement': 'DTX',
        },
        {
            'username': 'd_dal',
            'email': 'michelpen856@gmail.com',
            'password': 'eter',
            'first_name': 'Fatma',
            'last_name': 'Trabelsi',
            'role': 'DEMANDEUR',
            'departement': 'DAL',
        },
        {
            'username': 'a_dal',
            'email': 'testr77y@gmail.com',
            'password': 'eter',
            'first_name': 'Mohamed',
            'last_name': 'Khemiri',
            'role': 'ACHETEUR',
            'departement': 'DAL',
        }
    ]
    
    for user_data in test_users:
        username = user_data['username']
        
        if CustomUser.objects.filter(username=username).exists():
            print(f"L'utilisateur {username} existe déjà.")
            continue
        
        user = CustomUser.objects.create_user(**user_data)
        print(f"Utilisateur créé: {username} ({user.role} - {user.departement})")

if __name__ == '__main__':
    print("Création des utilisateurs de test ETER...")
    create_admin_user()
    create_test_users()
    print("Terminé!")