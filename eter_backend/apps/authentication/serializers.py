from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer personnalisé pour l'obtention de tokens JWT avec informations utilisateur
    """
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        
        # Ajouter des informations personnalisées au token
        token['role'] = user.role
        token['departement'] = user.departement
        token['full_name'] = user.get_full_name() or user.username
        
        return token
    
    def validate(self, attrs):
        """
        Validation personnalisée avec vérifications de sécurité
        """
        data = super().validate(attrs)
        
        # Ajouter les informations utilisateur dans la réponse
        user = self.user
        data.update({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user.role,
                'departement': user.departement,
                'full_name': user.get_full_name() or user.username,
                'permissions': {
                    'can_create_dl': user.can_create_dl(),
                    'can_validate_dl': user.can_validate_dl(),
                    'can_create_engagement': user.can_create_engagement(),
                }
            }
        })
        
        return data


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer pour l'inscription d'un nouvel utilisateur
    """
    password = serializers.CharField(
        write_only=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'password_confirm', 'role', 'departement', 'telephone'
        ]
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate(self, attrs):
        """
        Validation des champs du formulaire d'inscription
        """
        # Vérifier que les mots de passe correspondent
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Les mots de passe ne correspondent pas.'
            })
        
        # Validation spécifique aux rôles
        role = attrs.get('role')
        departement = attrs.get('departement')
        
        if role == 'DEMANDEUR' and not departement:
            raise serializers.ValidationError({
                'departement': 'Un département est requis pour les demandeurs.'
            })
        
        if role == 'ACHETEUR':
            attrs['departement'] = 'DAL'  # Force DAL pour les acheteurs
        
        if role == 'ADMIN':
            attrs['departement'] = None  # Pas de département pour les admin
        
        return attrs
    
    def create(self, validated_data):
        """
        Créer un nouvel utilisateur
        """
        # Supprimer password_confirm qui n'est pas un champ du modèle
        validated_data.pop('password_confirm')
        
        # Créer l'utilisateur avec mot de passe hashé
        password = validated_data.pop('password')
        user = CustomUser.objects.create_user(
            password=password,
            **validated_data
        )
        
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer pour la consultation et modification du profil utilisateur
    """
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    permissions = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'departement', 'telephone', 'date_joined', 'permissions'
        ]
        read_only_fields = ['id', 'username', 'date_joined', 'role', 'departement']
    
    def get_permissions(self, obj):
        """
        Récupérer les permissions de l'utilisateur
        """
        return {
            'can_create_dl': obj.can_create_dl(),
            'can_validate_dl': obj.can_validate_dl(),
            'can_create_engagement': obj.can_create_engagement(),
        }


class PasswordChangeSerializer(serializers.Serializer):
    """
    Serializer pour le changement de mot de passe
    """
    old_password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    new_password = serializers.CharField(
        write_only=True, 
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(write_only=True, style={'input_type': 'password'})
    
    def validate_old_password(self, value):
        """
        Vérifier que l'ancien mot de passe est correct
        """
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('L\'ancien mot de passe est incorrect.')
        return value
    
    def validate(self, attrs):
        """
        Vérifier que les nouveaux mots de passe correspondent
        """
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'Les nouveaux mots de passe ne correspondent pas.'
            })
        return attrs
    
    def save(self):
        """
        Sauvegarder le nouveau mot de passe
        """
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user