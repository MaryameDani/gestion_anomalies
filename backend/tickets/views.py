from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Utilisateur,Ticket, Vehicule, TypeAnomalie
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from .serializers import TicketSerializer

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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def creer_ticket(request):
    data = request.data

    try:
        # Récupération des champs du frontend
        vehicule_id = data.get('vehicule')
        utilisateur_assigne_id = data.get('utilisateur_assigne')
        anomalies_ids = data.get('anomalies', [])
        anomalies_personnalisees = data.get('anomalies_personnalisees', '')
        gravite = data.get('gravite')
        description = data.get('description', '')

        # Vérification et récupération des objets
        vehicule = Vehicule.objects.get(id=vehicule_id) if vehicule_id else None
        utilisateur_assigne = Utilisateur.objects.get(id=utilisateur_assigne_id) if utilisateur_assigne_id else None

        # Création du ticket
        ticket = Ticket.objects.create(
            vehicule=vehicule,
            utilisateur_assigne=utilisateur_assigne,
            utilisateur_createur=request.user,
            gravite=gravite,
            description=description,
            anomalies_personnalisees=anomalies_personnalisees,
        )

        # Ajout des anomalies prédéfinies
        if anomalies_ids:
            anomalies = TypeAnomalie.objects.filter(id__in=anomalies_ids)
            ticket.anomalies.set(anomalies)

        serializer = TicketSerializer(ticket)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    except Utilisateur.DoesNotExist:
        return Response({'error': "Utilisateur assigné non trouvé."}, status=status.HTTP_400_BAD_REQUEST)
    except Vehicule.DoesNotExist:
        return Response({'error': "Véhicule non trouvé."}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def suivre_tickets(request):
    """
    Cette vue retourne les tickets selon le rôle de l'utilisateur connecté :
    - ADMINISTRATEUR / MAINTENANCIER : voient tous les tickets.
    - PERMANENCIER_CAMION / PERMANENCIER_MACHINE : voient les tickets qu'ils ont créés.
    - PERMANENCIER_MAINTENANCE_DRAGLINE / PERMANENCIER_MAINTENANCE_ENGINS : voient les tickets qui leur sont assignés.
    """
    utilisateur = request.user
    type_utilisateur = utilisateur.user_type

    if type_utilisateur in ['ADMINISTRATEUR', 'MAINTENANCIER']:
        tickets = Ticket.objects.all()

    elif type_utilisateur in ['PERMANENCIER_CAMION', 'PERMANENCIER_MACHINE']:
        tickets = Ticket.objects.filter(utilisateur_createur=utilisateur)

    elif type_utilisateur in ['PERMANENCIER_MAINTENANCE_DRAGLINE', 'PERMANENCIER_MAINTENANCE_ENGINS']:
        tickets = Ticket.objects.filter(utilisateur_assigne=utilisateur)

    else:
        return Response({'detail': 'Accès non autorisé pour ce type d’utilisateur.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = TicketSerializer(tickets, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def changer_statut_ticket(request, ticket_id):
    """
    Permet à un permanencier machine ou camion de changer le statut du ticket,
    notamment de "RESOLU" à un utilisateur et de "clôturé" manuellement.
    """
    try:
        # Récupérer le ticket à modifier
        ticket = Ticket.objects.get(id=ticket_id)
        
        # Vérifier si l'utilisateur connecté est bien le permanencier assigné au ticket ou l'utilisateur créateur
        if ticket.utilisateur_assigne != request.user and ticket.utilisateur_createur != request.user:
            return Response({'error': "Vous n'êtes pas autorisé à modifier ce ticket."}, status=status.HTTP_403_FORBIDDEN)

        # Vérifier que l'utilisateur est un permanencier machine ou camion
        if request.user.user_type not in ['PERMANENCIER_CAMION', 'PERMANENCIER_MACHINE']:
            return Response({'error': "Vous devez être un permanencier machine ou camion pour modifier ce ticket."}, status=status.HTTP_403_FORBIDDEN)

        # Récupérer et valider le nouveau statut envoyé
        statut = request.data.get('statut')
        if statut not in ['NOUVEAU', 'EN_COURS', 'RESOLU', 'CLOTURE']:
            return Response({'error': "Statut invalide."}, status=status.HTTP_400_BAD_REQUEST)

        # Si l'utilisateur veut clore le ticket, on vérifie la condition
        if statut == 'CLOTURE' and ticket.statut != 'RESOLU':
            return Response({'error': "Le ticket doit être en statut 'Résolu' avant d'être clôturé."}, status=status.HTTP_400_BAD_REQUEST)

        # Modifier le statut du ticket
        ticket.statut = statut

        # Si le statut devient 'CLOTURE', on enregistre l'heure de clôture
        if statut == 'CLOTURE':
            ticket.heure_cloture = timezone.now()

        # Sauvegarder les modifications
        ticket.save()

        # Retourner les informations mises à jour du ticket
        return Response({'message': f"Statut du ticket {ticket.reference} mis à jour avec succès.", 'ticket': ticket.id}, status=status.HTTP_200_OK)

    except Ticket.DoesNotExist:
        return Response({'error': "Ticket non trouvé."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def assigner_ticket(request, ticket_id):
    """
    Permet à un permanencier machine ou camion d'assigner un ticket et de mettre
    automatiquement le statut à 'EN_COURS' dès qu'il est assigné.
    """
    try:
        # Récupérer le ticket à modifier
        ticket = Ticket.objects.get(id=ticket_id)

        # Vérifier si l'utilisateur connecté est un permanencier machine ou camion
        if request.user.user_type not in ['PERMANENCIER_MACHINE', 'PERMANENCIER_CAMION']:
            return Response({'error': "Vous devez être un permanencier machine ou camion pour assigner ce ticket."}, status=status.HTTP_403_FORBIDDEN)

        # Vérifier si l'utilisateur est autorisé à assigner le ticket
        if ticket.utilisateur_assigne is not None:
            return Response({'error': "Ce ticket est déjà assigné."}, status=status.HTTP_400_BAD_REQUEST)

        # Récupérer l'utilisateur assigné à partir des données de la requête
        utilisateur_assigne_id = request.data.get('utilisateur_assigne')
        if not utilisateur_assigne_id:
            return Response({'error': "L'ID de l'utilisateur assigné est requis."}, status=status.HTTP_400_BAD_REQUEST)

        utilisateur_assigne = Utilisateur.objects.get(id=utilisateur_assigne_id)

        # Assigner l'utilisateur au ticket
        ticket.utilisateur_assigne = utilisateur_assigne

        # Modifier le statut du ticket à 'EN_COURS' lorsqu'il est assigné
        ticket.statut = 'EN_COURS'

        # Enregistrer les modifications
        ticket.save()

        # Retourner les informations mises à jour du ticket
        return Response({'message': f"Ticket {ticket.reference} assigné avec succès à {utilisateur_assigne.username} et statut mis à 'EN_COURS'.", 'ticket': ticket.id}, status=status.HTTP_200_OK)

    except Ticket.DoesNotExist:
        return Response({'error': "Ticket non trouvé."}, status=status.HTTP_404_NOT_FOUND)
    except Utilisateur.DoesNotExist:
        return Response({'error': "Utilisateur assigné non trouvé."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
