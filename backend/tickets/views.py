from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Utilisateur

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Authentification JWT sans nécessité de spécifier le user_type
    Le type d'utilisateur est déterminé automatiquement à partir de la base
    """
    username = request.data.get('username')
    password = request.data.get('password')

    # Authentification de l'utilisateur
    user = authenticate(username=username, password=password)
    
    if user is None:
        return Response({
            'success': False,
            'message': 'Identifiants incorrects'
        }, status=401)

    # Génération des tokens JWT
    refresh = RefreshToken.for_user(user)
    
    # Récupération des détails de l'utilisateur
    user_data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'user_type': user.user_type,  # Le type est récupéré depuis la base
        'phone': user.phone,
    }
    
    return Response({
        'success': True,
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': user_data
    })
        
@api_view(['POST'])
def logout_view(request):
    """
    Vue pour la déconnexion des utilisateurs.
    """
    # Supprimer les tokens côté client (géré par le frontend)
    return Response({
        'success': True,
        'message': 'Déconnexion réussie'
    })
