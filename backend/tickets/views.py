from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Utilisateur,Ticket, Vehicule, TypeAnomalie, Conducteur
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from .serializers import TicketSerializer, TypeAnomalieSerializer , VehiculeSerializer
from django.utils.timezone import make_aware
from datetime import datetime, timedelta, time
from decimal import Decimal
from dateutil.parser import parse as dateutil_parse

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
def get_utilisateur_info_by_user_type(request):
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
        poste = data.get('poste')
        statut= data.get('statut', 'NOUVEAU')

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
            poste= poste,
            statut=statut,
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_info(request):
    user = request.user
    return Response({
        "username": user.username,
        "email": user.email,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lister_pannes(request):
    """
    Retourne les pannes filtrées par type de véhicule selon le rôle de l'utilisateur connecté :
    - Permanencier Machine → pannes des machines
    - Permanencier Camion → pannes des camions
    - Autres (ex. admin, maintenancier) → toutes les pannes
    """
    try:
        user_type = request.user.user_type

        if user_type == 'PERMANENCIER_MACHINE':
            pannes = TypeAnomalie.objects.filter(type_vehicule_concerne='MACHINE')
        elif user_type == 'PERMANENCIER_CAMION':
            pannes = TypeAnomalie.objects.filter(type_vehicule_concerne='CAMION')
        else:
            pannes = TypeAnomalie.objects.all()

        serializer = TypeAnomalieSerializer(pannes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lister_vehicules(request):
    """
    Retourne les véhicules filtrés selon le type de l'utilisateur connecté :
    - Permanencier Camion → véhicules de type CAMION
    - Permanencier Machine → véhicules de type MACHINE
    - Autres utilisateurs → tous les véhicules
    """
    user = request.user

    if user.user_type == 'PERMANENCIER_CAMION':
        vehicules = Vehicule.objects.filter(type_vehicule='CAMION')
    elif user.user_type == 'PERMANENCIER_MACHINE':
        vehicules = Vehicule.objects.filter(type_vehicule='MACHINE')
    else:
        vehicules = Vehicule.objects.all()

    serializer = VehiculeSerializer(vehicules, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def creer_formulaire_fin_poste(request):
    try:
        data = request.data

        type_vehicule = data.get('type_vehicule')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        phone = data.get('phone')
        date_poste = data.get('date_poste')
        heure_debut = data.get('heure_debut')
        heure_fin = data.get('heure_fin')
        heure_de_fin_du_conteur = data.get('heure_de_fin_du_conteur')
        commentaire = data.get('commentaire')
        poste = data.get('poste')

        if not type_vehicule:
            return Response({'error': 'Le champ type_vehicule est requis.'}, status=status.HTTP_400_BAD_REQUEST)

        vehicule = Vehicule.objects.filter(type_vehicule__iexact=type_vehicule).first()
        if not vehicule:
            return Response({'error': f"Aucun véhicule trouvé pour le type '{type_vehicule}'."}, status=status.HTTP_404_NOT_FOUND)

        conducteur_existant = Conducteur.objects.filter(
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            date_poste=date_poste,
            vehicule=vehicule
        ).first()

        if conducteur_existant:
            return Response({'message': 'Conducteur déjà enregistré pour ce véhicule ce jour-là.'}, status=status.HTTP_200_OK)

        # Conversion sécurisée des dates
        heure_debut_parsed = dateutil_parse(str(heure_debut)) if heure_debut else None
        heure_fin_parsed = dateutil_parse(str(heure_fin)) if heure_fin else None

        # Calcul des heures travaillées
        conducteur_prec = Conducteur.objects.filter(
            vehicule=vehicule,
            date_poste__lt=date_poste
        ).order_by('-date_poste').first()

        heure_conteur_prec = float(conducteur_prec.heure_de_fin_du_conteur) if conducteur_prec and conducteur_prec.heure_de_fin_du_conteur else 0.0
        heure_conteur_actuel = float(heure_de_fin_du_conteur)

        heures_travaillees = round(heure_conteur_actuel - heure_conteur_prec, 2)

        # Création
        Conducteur.objects.create(
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            date_poste=date_poste,
            heure_debut=heure_debut_parsed,
            heure_fin=heure_fin_parsed,
            heures_travaillees=heures_travaillees,
            heure_de_fin_du_conteur=heure_de_fin_du_conteur,
            commentaire=commentaire,
            poste=poste,
            vehicule=vehicule
        )

        return Response({'message': 'Fin de poste enregistrée avec succès.'}, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def film_activite_vehicules(request):
    """
    Vue qui retourne l'activité des véhicules poste par poste pour aujourd'hui :
    - Heures de début et de fin du poste
    - Heures de travail des conducteurs 
    - Arrêts déterminés via les tickets
    - Arrêts non déterminés (plages horaires non couvertes)
    """
    date_auj = datetime.now().date()
    
    postes = {
        "Premier poste": (time(7, 0), time(15, 0)),
        "Deuxième poste": (time(15, 0), time(23, 0)),
        "Troisième poste": (time(23, 0), time(7, 0)),
    }

    resultat = []

    vehicules = Vehicule.objects.all()

    for vehicule in vehicules:
        vehicule_info = {
            "vehicule": vehicule.type_vehicule, 
            "postes": []
        }

        for nom_poste, (heure_debut, heure_fin) in postes.items():
            # Calculer heure de début et de fin réels
            dt_debut = make_aware(datetime.combine(date_auj, heure_debut))
            if heure_fin > heure_debut:
                dt_fin = make_aware(datetime.combine(date_auj, heure_fin))
            else:
                dt_fin = make_aware(datetime.combine(date_auj + timedelta(days=1), heure_fin))

            # Conducteur actif pour ce poste
            conducteur = Conducteur.objects.filter(
                vehicule=vehicule,
                date_poste=date_auj,
                poste__icontains=nom_poste.split()[0].upper()
            ).first()

            travail = {
                "heure_debut_travail": conducteur.heure_debut if conducteur else None,
                "heure_fin_travail": conducteur.heure_fin if conducteur else None,
                "heures_travaillees": conducteur.heures_travaillees if conducteur else 0,
            }

            # Tickets pendant le poste = arrêts déterminés
            tickets = Ticket.objects.filter(
                vehicule=vehicule,
                date_creation=date_auj,
                heure_creation__lt=dt_fin,
                heure_cloture__gt=dt_debut
            )

            arrêts_determines = [
                {
                    "debut": ticket.heure_debut,
                    "fin": ticket.heure_fin,
                    "type": ticket.type_anomalie.nom,
                }
                for ticket in tickets
            ]

            arrêts_non_determines = []
            if conducteur:
                plages_occupees = [(t.heure_debut, t.heure_fin) for t in tickets]
                plages_occupees.append((conducteur.heure_debut, conducteur.heure_fin))
                plages_occupees.sort()
                
                current = dt_debut
                for start, end in plages_occupees:
                    if current < start:
                        arrêts_non_determines.append({
                            "debut": current,
                            "fin": start
                        })
                    current = max(current, end)
                
                if current < dt_fin:
                    arrêts_non_determines.append({
                        "debut": current,
                        "fin": dt_fin
                    })

            vehicule_info["postes"].append({
                "nom_poste": nom_poste,
                "heure_debut_poste": dt_debut,
                "heure_fin_poste": dt_fin,
                "travail": travail,
                "arrets_determines": arrêts_determines,
                "arrets_non_determines": arrêts_non_determines
            })

        resultat.append(vehicule_info)

    return Response(resultat)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enregistrer_pannes_formulaire(request):
    user = request.user

    if not hasattr(user, 'user_type') or user.user_type not in ['PERMANENCIER_CAMION', 'PERMANENCIER_MACHINE']:
        return Response({"detail": "Accès interdit : rôle requis."}, status=status.HTTP_403_FORBIDDEN)

    type_vehicule = 'CAMION' if user.user_type == 'PERMANENCIER_CAMION' else 'MACHINE'

    pannes_ids = request.data.get('pannes_ids', [])  # liste d'IDs de TypeAnomalie
    panne_personnalisee = request.data.get('panne_personnalisee', '').strip()
    description = request.data.get('description', '').strip()

    pannes_existantes = TypeAnomalie.objects.filter(id__in=pannes_ids, type_vehicule_concerne=type_vehicule)

    resultats = {
        "pannes_existantes": [str(p) for p in pannes_existantes],
        "panne_personnalisee": panne_personnalisee,
        "description": description,
        "type_utilisateur": user.user_type
    }

    # Si tu veux créer la panne personnalisée dans la BDD (optionnel)
    if panne_personnalisee:
        nouvelle_panne = TypeAnomalie.objects.create(
            nom=panne_personnalisee[:100],
            identifiant=f"custom_{user.id}_{panne_personnalisee[:10].replace(' ', '_')}",
            description=description,
            gravite_par_defaut='MOYENNE',
            type_vehicule_concerne=type_vehicule,
            est_personnalisee=True,
            est_active=True
        )
        resultats["panne_personnalisee_creee"] = str(nouvelle_panne)

    return Response(resultats, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lister_utilisateurs_par_type(request):
    user_types = request.query_params.getlist('user_type')

    if not user_types:
        return Response({'success': False, 'message': 'Paramètre user_type requis (au moins un).'}, status=400)

    utilisateurs = Utilisateur.objects.filter(user_type__in=user_types)

    data = [
        {
            'id': u.id,
            'username': u.username,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'email': u.email,
            'phone': u.phone
        }
        for u in utilisateurs
    ]

    return Response({'success': True, 'utilisateurs': data})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def suivre_tickets_par_id(request, ticket_id=None):
    """
    Vue qui retourne :
    - tous les tickets visibles par l'utilisateur selon son rôle,
    - ou un ticket spécifique s’il est autorisé à le voir.
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
        return Response({'detail': 'Accès non autorisé.'}, status=status.HTTP_403_FORBIDDEN)

    # Si ticket_id est fourni dans l’URL
    if ticket_id is not None:
        tickets = tickets.filter(id=ticket_id)
        if not tickets.exists():
            return Response({'detail': 'Ticket introuvable ou non autorisé.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = TicketSerializer(tickets, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
