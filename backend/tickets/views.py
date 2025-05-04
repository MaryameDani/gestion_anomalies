from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Utilisateur
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

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

@login_required
def get_utilisateur_info_by_role(request):
    utilisateur = request.user  # L'utilisateur authentifié est dans request.user

    if utilisateur.is_authenticated:
        user_data = {
            'id': utilisateur.id,
            'username': utilisateur.username,
            'email': utilisateur.email,
            'first_name': utilisateur.first_name,
            'last_name': utilisateur.last_name,
            'user_type': utilisateur.user_type,  # Adapte le nom du champ si nécessaire
            'phone': utilisateur.phone,        # Adapte le nom du champ si nécessaire
        }
        return JsonResponse({'success': True, 'user': user_data})
    else:
        return JsonResponse({'success': False, 'error': 'Utilisateur non authentifié'}, status=401)
    
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Utilisateur  # Assure-toi que le chemin est correct

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_utilisateur_info(request):
    utilisateur = request.user

    user_data = {
        'id': utilisateur.id,
        'username': utilisateur.username,
        'email': utilisateur.email,
        'first_name': utilisateur.first_name,
        'last_name': utilisateur.last_name,
        'user_type': utilisateur.user_type,
        'phone': utilisateur.phone,
    }
    return Response({'success': True, 'user': user_data})