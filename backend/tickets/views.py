from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Utilisateur,Ticket, Vehicule, TypeAnomalie, Conducteur, ArretVehicule
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.utils import timezone
from .serializers import TicketSerializer, TypeAnomalieSerializer , VehiculeSerializer, TicketDetailSerializer , TableauArretSerializer , TicketUpdateHeuresSerializer
from django.utils.timezone import make_aware
from datetime import datetime, timedelta, time
from decimal import Decimal
from dateutil.parser import parse as dateutil_parse
from collections import defaultdict
from django.utils.timezone import localdate
from django.utils.dateparse import parse_datetime
from zoneinfo import ZoneInfo
from django.utils import timezone
from datetime import datetime, timedelta, date, time
import pytz

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
        'user_type': user.user_type, 
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
        vehicule_id = data.get('vehicule')
        utilisateur_assigne_id = data.get('utilisateur_assigne')
        anomalies_ids = data.get('anomalies', [])
        anomalies_personnalisees = data.get('anomalies_personnalisees', '')
        gravite = data.get('gravite')
        description = data.get('description', '')
        poste = data.get('poste')
        statut = data.get('statut', 'NOUVEAU')

        vehicule = Vehicule.objects.get(id=vehicule_id) if vehicule_id else None
        utilisateur_assigne = Utilisateur.objects.get(id=utilisateur_assigne_id) if utilisateur_assigne_id else None
        ticket = Ticket.objects.create(
            vehicule=vehicule,
            utilisateur_assigne=utilisateur_assigne,
            utilisateur_createur=request.user,
            gravite=gravite,
            description=description,
            anomalies_personnalisees=anomalies_personnalisees,
            poste=poste,
            statut=statut,
        )

        if anomalies_ids:
            anomalies = TypeAnomalie.objects.filter(id__in=anomalies_ids)
            ticket.anomalies.set(anomalies)

        # Création automatique d'un arrêt lié
        noms_anomalies = list(anomalies.values_list('nom', flat=True)) if anomalies_ids else []
        if anomalies_personnalisees:
            noms_anomalies.append(anomalies_personnalisees.strip())

        type_arret = " / ".join(noms_anomalies)[:100] or "Anomalie sans nom"

        ArretVehicule.objects.create(
            vehicule=vehicule,
            type_arret=type_arret,
            heure_debut=timezone.now(),
            description=description,
            date_determination=timezone.now(),
            ticket=ticket
        )

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
    utilisateur = request.user
    type_utilisateur = utilisateur.user_type

    if type_utilisateur in ['ADMINISTRATEUR','MAINTENANCIER']:
        tickets = Ticket.objects.all()

    elif type_utilisateur in ['PERMANENCIER_CAMION', 'PERMANENCIER_MACHINE']:
        tickets = Ticket.objects.filter(utilisateur_createur=utilisateur)

    elif type_utilisateur in ['PERMANENCIER_MAINTENANCE_DRAGLINE', 'PERMANENCIER_MAINTENANCE_ENGINS']:
        tickets = Ticket.objects.filter(utilisateur_assigne=utilisateur)

    else:
        return Response({'detail': 'Accès non autorisé pour ce type d\'utilisateur.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = TicketDetailSerializer(tickets, many=True)
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
        if request.user.user_type not in ['PERMANENCIER_CAMION', 'PERMANENCIER_MACHINE', 'PERMANENCIER_MAINTENANCE_DRAGLINE', 'PERMANENCIER_MAINTENANCE_ENGINS']:
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

        if statut == 'CLOTURE':
            ticket.heure_cloture = timezone.now()
            try:
                arret_vehicule = ArretVehicule.objects.get(ticket=ticket)
                arret_vehicule.heure_fin = ticket.heure_cloture 
                arret_vehicule.save()
            except ArretVehicule.DoesNotExist:
                pass 

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
            pannes = TypeAnomalie.objects.filter(type_vehicule_concerne__in=['MACHINE','ENGIN','BULL'])
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
        vehicules = Vehicule.objects.filter(type_vehicule__in=['MACHINE', 'ENGIN', 'BULL'])
    else:
        vehicules = Vehicule.objects.all()

    serializer = VehiculeSerializer(vehicules, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def creer_formulaire_fin_poste(request):
    try:
        data = request.data
        
        modele = data.get('modele')
        first_name = data.get('first_name')
        last_name = data.get('last_name')
        phone = data.get('phone')
        date_poste_str = data.get('date_poste')
        heure_debut_str = data.get('heure_debut')  # Format "23:00"
        heure_fin_str = data.get('heure_fin')      # Format "07:30"
        heure_de_fin_du_compteur = data.get('heure_de_fin_du_compteur')
        commentaire = data.get('commentaire')
        poste_str = data.get('poste')
        
        if not modele:
            return Response({'error': 'Le champ modele est requis.'}, status=status.HTTP_400_BAD_REQUEST)
        
        vehicule = Vehicule.objects.filter(modele__iexact=modele).first()
        
        if not vehicule:
            return Response({'error': f"Aucun véhicule trouvé pour le modèle '{modele}'."}, status=status.HTTP_404_NOT_FOUND)
        
        # Parse date_poste_str to a date object
        date_poste_obj = datetime.strptime(date_poste_str, '%Y-%m-%d').date()
        
        # Parse time strings to time objects
        debut_time = datetime.strptime(heure_debut_str, '%H:%M').time()
        fin_time = datetime.strptime(heure_fin_str, '%H:%M').time()
        
        # SOLUTION: Utiliser des datetimes naïves (sans fuseau horaire)
        # Cela préservera exactement les heures saisies par l'utilisateur
        
        # Combine date and time to create naive datetimes
        heure_debut_naive = datetime.combine(date_poste_obj, debut_time)
        
        # Handle the case where fin_time is less than debut_time (e.g., night shift)
        next_day = date_poste_obj + timedelta(days=1) if int(poste_str) == 3 and fin_time < debut_time else date_poste_obj
        heure_fin_naive = datetime.combine(next_day, fin_time)
        
        # IMPORTANT: Ne pas convertir en timezone aware - garder les datetimes naïves
        # C'est le moyen le plus simple de s'assurer que les heures sont stockées exactement comme entrées
        heure_debut = heure_debut_naive
        heure_fin = heure_fin_naive
        
        # Check for existing conducteur to prevent exact duplicates for the same shift
        conducteur_existant = Conducteur.objects.filter(
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            vehicule=vehicule,
            poste=poste_str,
            # Utiliser la date uniquement pour la comparaison (pas l'heure exacte)
            date_poste=date_poste_obj
        ).first()
        
        if conducteur_existant:
            return Response({'message': 'Conducteur déjà enregistré pour ce véhicule, ce jour-là et ce poste.'}, status=status.HTTP_200_OK)
        
        # Calculate hours worked based on compteur values
        conducteur_prec = Conducteur.objects.filter(
            vehicule=vehicule,
            heure_fin__lt=heure_debut
        ).order_by('-heure_fin').first()
        
        heure_compteur_prec = float(conducteur_prec.heure_de_fin_du_compteur) if conducteur_prec and conducteur_prec.heure_de_fin_du_compteur else 0.0
        heure_compteur_actuel = float(heure_de_fin_du_compteur) if heure_de_fin_du_compteur else 0.0
        
        heures_travaillees_calculated = round(heure_compteur_actuel - heure_compteur_prec, 2)
        
        # Create the Conducteur entry with naive datetimes
        conducteur = Conducteur.objects.create(
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            date_poste=date_poste_obj, 
            heure_debut=heure_debut,         # Naive datetime
            heure_fin=heure_fin,             # Naive datetime
            heure_de_fin_du_compteur=heure_de_fin_du_compteur,
            commentaire=commentaire,
            poste=poste_str,
            vehicule=vehicule,
            heures_travaillees=heures_travaillees_calculated
        )
        
        # Pour le débogage - ajoutez des détails sur le fuseau horaire
        debug_info = {
            'message': 'Formulaire de fin de poste créé avec succès.',
            'id': conducteur.id,
            'debug': {
                'date_poste': date_poste_obj.strftime('%Y-%m-%d'),
                'heure_debut_raw': heure_debut_str,
                'heure_fin_raw': heure_fin_str,
                'heure_debut_stored': heure_debut.strftime('%Y-%m-%d %H:%M:%S'),
                'heure_fin_stored': heure_fin.strftime('%Y-%m-%d %H:%M:%S'),
                'poste': poste_str,
                'heures_travaillees': heures_travaillees_calculated
            }
        }
        
        return Response(debug_info, status=status.HTTP_201_CREATED)
    
    except ValueError as ve:
        return Response({'error': f"Erreur de format de données: {ve}. Assurez-vous que les dates et heures sont au bon format (YYYY-MM-DD, HH:MM)."}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': f"Une erreur inattendue est survenue: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

PREMIER_POSTE = 1
DEUXIEME_POSTE = 2
TROISIEME_POSTE = 3

def get_poste_time_range(date, poste):
    if poste == 1:
        heure_debut = time(7, 0, 0)
        heure_fin = time(15, 0, 0)
    elif poste == 2:
        heure_debut = time(15, 0, 0)
        heure_fin = time(23, 0, 0)
    elif poste == 3:
        heure_debut = time(23, 0, 0)
        heure_fin = time(7, 0, 0)
    else:
        raise ValueError("Poste invalide. Utilisez 1 (matin), 2 (après-midi), ou 3 (nuit).")

    naive_debut = datetime.combine(date, heure_debut)
    naive_fin = datetime.combine(date + timedelta(days=1) if poste == 3 else date, heure_fin)

    # Rendre les datetime aware
    # Ensure ZoneInfo is correctly imported and used
    aware_debut = timezone.make_aware(naive_debut, timezone=ZoneInfo("Africa/Casablanca"))
    aware_fin = timezone.make_aware(naive_fin, timezone=ZoneInfo("Africa/Casablanca"))

    return aware_debut, aware_fin

def get_valeur_compteur(date_jour, heure, vehicule):
    datetime_cible_naive = datetime.combine(date_jour, heure)
    # Assurez-vous que votre fuseau horaire par défaut est bien configuré ou utilisez le même que celui de la fonction principale
    # Ensure make_aware is imported from django.utils.timezone
    datetime_cible = timezone.make_aware(datetime_cible_naive, timezone=ZoneInfo("Africa/Casablanca"))

    conducteur = Conducteur.objects.filter(
        vehicule=vehicule,
        heure_fin__lte=datetime_cible
    ).order_by('-heure_fin').first()

    if conducteur:
        return conducteur.heure_de_fin_du_compteur 
    return 0

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def film_activite_vehicules(request):
    user = request.user
    user_type = user.user_type
    date_str = request.GET.get('date')
    if not date_str:
        date_objet = timezone.now().date()  # Date actuelle par défaut
    else:
        try:
            date_objet = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return JsonResponse({'error': 'Format de date invalide. Utilisez %Y-%m-%d.'}, status=400)
    
    if user_type == "PERMANENCIER_CAMION":
        vehicules = Vehicule.objects.filter(type_vehicule="CAMION")
    elif user_type == "PERMANENCIER_MACHINE":
        vehicules = Vehicule.objects.filter(type_vehicule__in=['MACHINE', 'ENGIN', 'BULL'])
    else:
        vehicules = Vehicule.objects.all()

    resultats = []

    # Définition des plages horaires des postes
    postes_time_ranges = {
        1: (datetime.combine(date_objet, time(7, 0)), datetime.combine(date_objet, time(15, 0))),
        2: (datetime.combine(date_objet, time(15, 0)), datetime.combine(date_objet, time(23, 0))),
        3: (datetime.combine(date_objet, time(23, 0)), datetime.combine(date_objet + timedelta(days=1), time(7, 0)))
    }

    for vehicule in vehicules:
        all_activites = []
        heures_travaillees = {1: 0, 2: 0, 3: 0}
        periodes_arret = []

        travail_activites = []
        for poste in [1, 2, 3]:
            debut_poste, fin_poste = postes_time_ranges[poste]
            debut_poste_aware = timezone.make_aware(debut_poste)
            fin_poste_aware = timezone.make_aware(fin_poste)

            conducteurs = Conducteur.objects.filter(
                vehicule=vehicule,
                heure_debut__lt=fin_poste_aware,
                heure_fin__gt=debut_poste_aware
            ).distinct()

            processed_shifts = set()

            for conducteur in conducteurs:
                heure_debut_naive = conducteur.heure_debut.replace(tzinfo=None) if conducteur.heure_debut.tzinfo else conducteur.heure_debut
                heure_fin_naive = conducteur.heure_fin.replace(tzinfo=None) if conducteur.heure_fin.tzinfo else conducteur.heure_fin

                heure_debut = max(heure_debut_naive, debut_poste)
                heure_fin = min(heure_fin_naive, fin_poste)
                if heure_fin <= heure_debut:
                    continue
                
                shift_key = (conducteur.id, heure_debut.strftime('%Y-%m-%dT%H:%M:%S'), 
                            heure_fin.strftime('%Y-%m-%dT%H:%M:%S'), poste)
                if shift_key in processed_shifts:
                    continue
                processed_shifts.add(shift_key)

                # Calcul heure du compteur du poste précédent (poste - 1) si applicable
                heure_fin_compteur_precedent = None
                if poste > 1:
                    poste_precedent = poste - 1
                    conducteur_precedent = Conducteur.objects.filter(
                        vehicule=vehicule,
                        poste=poste_precedent,
                        heure_fin__date=date_objet
                    ).first()
                    if conducteur_precedent:
                        heure_fin_compteur_precedent = conducteur_precedent.heure_de_fin_du_compteur

                heure_fin_compteur_actuel = conducteur.heure_de_fin_du_compteur

                # Calcul durée selon compteur si possible, sinon durée classique
                if (heure_fin_compteur_precedent is not None) and (heure_fin_compteur_actuel is not None):
                    duree_travail = heure_fin_compteur_actuel - heure_fin_compteur_precedent
                    if duree_travail < 0:
                        duree_travail = max(0, (heure_fin - heure_debut).total_seconds() / 3600.0)
                else:
                    duree_travail = (heure_fin - heure_debut).total_seconds() / 3600.0

                travail_activites.append({
                    "type": "travail",
                    "heure_debut": heure_debut,
                    "heure_fin": heure_fin,
                    "conducteur": f"{conducteur.first_name} {conducteur.last_name}",
                    "poste": poste,
                    "duree_travail": duree_travail
                })

        # Collecte des arrêts (tickets)
        arrets_activites = []
        tickets = Ticket.objects.filter(
            vehicule=vehicule,
            statut="CLOTURE",
            heure_creation__date=date_objet
        )
        for ticket in tickets:
            heure_creation_naive = ticket.heure_creation.replace(tzinfo=None) if ticket.heure_creation.tzinfo else ticket.heure_creation
            if not ticket.heure_cloture:
                continue
            heure_cloture_naive = ticket.heure_cloture.replace(tzinfo=None) if ticket.heure_cloture.tzinfo else ticket.heure_cloture
            periodes_arret.append((heure_creation_naive, heure_cloture_naive))
            arrets_activites.append({
                "type": "arret_determiné_ticket",
                "heure_debut": heure_creation_naive,
                "heure_fin": heure_cloture_naive,
                "source": "ticket",
                "cause": ticket.description
            })

        # Collecte des arrêts (formulaires)
        arrets = ArretVehicule.objects.filter(
            vehicule=vehicule,
            heure_debut__date=date_objet
        )
        for arret in arrets:
            heure_debut_naive = arret.heure_debut.replace(tzinfo=None) if arret.heure_debut.tzinfo else arret.heure_debut
            heure_fin_naive = arret.heure_fin.replace(tzinfo=None) if arret.heure_fin and arret.heure_fin.tzinfo else (heure_debut_naive + timedelta(minutes=30))
            periodes_arret.append((heure_debut_naive, heure_fin_naive))
            arrets_activites.append({
                "type": "arret_determiné_formulaire",
                "heure_debut": heure_debut_naive,
                "heure_fin": heure_fin_naive,
                "source": "formulaire",
                "cause": arret.type_arret
            })

        # Calcul des heures travaillées nettes en soustrayant les arrêts
        for activite in travail_activites:
            poste = activite["poste"]
            duree_travail = activite.get("duree_travail", 0)
            debut_travail = activite["heure_debut"]
            fin_travail = activite["heure_fin"]

            for debut_arret, fin_arret in periodes_arret:
                if fin_arret > debut_travail and debut_arret < fin_travail:
                    debut_intersection = max(debut_travail, debut_arret)
                    fin_intersection = min(fin_travail, fin_arret)
                    duree_arret = (fin_intersection - debut_intersection).total_seconds() / 3600.0
                    duree_travail -= duree_arret
            
            heures_travaillees[poste] += max(0, duree_travail)

            activite["heure_debut"] = activite["heure_debut"].strftime('%Y-%m-%dT%H:%M:%S')
            activite["heure_fin"] = activite["heure_fin"].strftime('%Y-%m-%dT%H:%M:%S')
            all_activites.append(activite)

        for arret in arrets_activites:
            arret["heure_debut"] = arret["heure_debut"].strftime('%Y-%m-%dT%H:%M:%S')
            arret["heure_fin"] = arret["heure_fin"].strftime('%Y-%m-%dT%H:%M:%S')
            all_activites.append(arret)

        all_activites.sort(key=lambda x: datetime.strptime(x["heure_debut"], '%Y-%m-%dT%H:%M:%S'))

        activites_avec_vides = []
        initial_start_of_day = datetime.combine(date_objet, time(7, 0))
        last_fin = initial_start_of_day

        for act in all_activites:
            current_act_start = datetime.strptime(act["heure_debut"], '%Y-%m-%dT%H:%M:%S')
            current_act_end = datetime.strptime(act["heure_fin"], '%Y-%m-%dT%H:%M:%S')
            if current_act_start > last_fin:
                activites_avec_vides.append({
                    "type": "arret_non_déterminé",
                    "heure_debut": last_fin.strftime('%Y-%m-%dT%H:%M:%S'),
                    "heure_fin": current_act_start.strftime('%Y-%m-%dT%H:%M:%S'),
                    "source": "automatique"
                })
            activites_avec_vides.append(act)
            last_fin = max(last_fin, current_act_end)

        fin_journee = datetime.combine(date_objet + timedelta(days=1), time(7, 0))
        if last_fin < fin_journee:
            activites_avec_vides.append({
                "type": "arret_non_déterminé",
                "heure_debut": last_fin.strftime('%Y-%m-%dT%H:%M:%S'),
                "heure_fin": fin_journee.strftime('%Y-%m-%dT%H:%M:%S'),
                "source": "automatique"
            })

        resultats.append({
            "vehicule": vehicule.modele,
            "type_vehicule": vehicule.type_vehicule,
            "date": date_objet.strftime('%Y-%m-%d'),
            "heures_travaillees": {str(k): round(v, 2) for k, v in heures_travaillees.items()},
            "activites": activites_avec_vides
        })

    return JsonResponse(resultats, safe=False, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enregistrer_pannes_formulaire(request):
    data = request.data
    vehicule_id = data.get('vehicule_id')
    type_arret = data.get('type_arret')
    heure_debut_str = data.get('heure_debut')
    heure_fin_str = data.get('heure_fin', None)

    # Vérification des champs obligatoires
    if not all([vehicule_id, type_arret, heure_debut_str]):
        return Response({"detail": "Champs obligatoires manquants"}, status=status.HTTP_400_BAD_REQUEST)

    # Conversion des dates en datetime Python
    heure_debut = parse_datetime(heure_debut_str)
    if heure_debut is None:
        return Response({"detail": "Format de heure_debut invalide"}, status=status.HTTP_400_BAD_REQUEST)

    heure_fin = None
    if heure_fin_str:
        heure_fin = parse_datetime(heure_fin_str)
        if heure_fin is None:
            return Response({"detail": "Format de heure_fin invalide"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        vehicule = Vehicule.objects.get(id=vehicule_id)
    except Vehicule.DoesNotExist:
        return Response({"detail": "Véhicule non trouvé"}, status=status.HTTP_400_BAD_REQUEST)

    # Création de l'arrêt
    arret = ArretVehicule.objects.create(
        vehicule=vehicule,
        type_arret=type_arret,
        heure_debut=heure_debut,
        heure_fin=heure_fin
    )

    return Response({"detail": "Arrêt véhicule enregistré", "arret_id": arret.id}, status=status.HTTP_201_CREATED)


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

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def assigner_ticket_maintenance(request, ticket_id):
    """
    Permet à un permanencier dragline ou engin d'assigner un ticket à un maintenancier.
    """
    try:
        # Récupérer le ticket concerné
        try:
            ticket = Ticket.objects.get(id=ticket_id)
        except Ticket.DoesNotExist:
            return Response({'error': "Ticket non trouvé."}, status=status.HTTP_404_NOT_FOUND)

        # Vérifier si l'utilisateur est un permanencier autorisé
        if request.user.user_type not in ['PERMANENCIER_MAINTENANCE_DRAGLINE', 'PERMANENCIER_MAINTENANCE_ENGINS']:
            return Response({'error': "Vous devez être un permanencier maintenance pour assigner ce ticket."},
                            status=status.HTTP_403_FORBIDDEN)

        # Vérifier si le ticket est déjà assigné à un maintenancier
        if ticket.utilisateur_assigne_maintenance is not None:
            return Response({'error': "Ce ticket est déjà assigné à un maintenancier."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Récupérer l'ID du maintenancier à assigner
        utilisateur_id = request.data.get('utilisateur_assigne_maintenance')
        if not utilisateur_id:
            return Response({'error': "L'ID du maintenancier est requis."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Vérifier que l'utilisateur existe
        try:
            utilisateur_maintenance = Utilisateur.objects.get(id=utilisateur_id)
        except Utilisateur.DoesNotExist:
            return Response({'error': "Utilisateur maintenancier non trouvé."},
                            status=status.HTTP_404_NOT_FOUND)

        # Assigner le maintenancier au champ spécifique
        ticket.utilisateur_assigne_maintenance = utilisateur_maintenance
        ticket.save()

        return Response({
            'message': f"Ticket {ticket.reference} assigné avec succès à {utilisateur_maintenance.username}.",
            'ticket_id': ticket.id
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({'error': f"Erreur lors de l'assignation du ticket : {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tableau_arrets(request):
    user_type = getattr(request.user, 'user_type', None)
    if user_type == 'PERMANENCIER_CAMION':
        type_vehicule_vise = ['CAMION']
    elif user_type == 'PERMANENCIER_MACHINE':
        type_vehicule_vise =['MACHINE', 'ENGIN', 'BULL']
        vehicules = Vehicule.objects.filter(type_vehicule__in=type_vehicule_vise)
    else:
        return Response({"error": "Accès non autorisé pour ce rôle."}, status=status.HTTP_403_FORBIDDEN)

    tickets_avec_arrets = Ticket.objects.filter(
        arrets__isnull=False,
        vehicule__type_vehicule__in=type_vehicule_vise
    ).select_related('vehicule')\
     .prefetch_related('arrets')\
     .order_by('-date_creation')

    donnees = []
    for ticket in tickets_avec_arrets:
        first_arret_type = ticket.arrets.first().type_arret if ticket.arrets.first() else "N/A"

        donnees.append({
            'id': ticket.id, 
            'vehicule_modele': ticket.vehicule.modele if ticket.vehicule else "N/A",
            'type_arret': first_arret_type, 
            'heure_creation': ticket.heure_creation,
            'heure_cloture': ticket.heure_cloture,
        })
        
    serializer = TableauArretSerializer(donnees, many=True)
    return Response(serializer.data)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def modifier_heures_ticket(request, ticket_id):
    try:
        ticket = Ticket.objects.get(id=ticket_id)
    except Ticket.DoesNotExist:
        return Response({'error': "Ticket non trouvé."}, status=status.HTTP_404_NOT_FOUND)

    user_type = getattr(request.user, 'user_type', None)

    if user_type == 'PERMANENCIER_CAMION':
        type_vehicule_vise = ['CAMION']
    elif user_type == 'PERMANENCIER_MACHINE':
        type_vehicule_vise = ['MACHINE', 'ENGIN', 'BULL']
    else:
        return Response({"error": "Accès non autorisé pour ce rôle."}, status=status.HTTP_403_FORBIDDEN)

    if ticket.vehicule is None:
        return Response({"error": "Ticket sans véhicule."}, status=status.HTTP_400_BAD_REQUEST)

    if ticket.vehicule.type_vehicule not in type_vehicule_vise:
        return Response({"error": "Vous ne pouvez pas modifier ce ticket."}, status=status.HTTP_403_FORBIDDEN)

    serializer = TicketUpdateHeuresSerializer(ticket, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from .models import Vehicule, Ticket


@api_view(['GET'])
def situation_parc(request):
    from django.db.models import Q
    from .models import Vehicule, Ticket

    categories = {
        'CAMIONS': {'filter': Q(type_vehicule__icontains='CAMION'), 'title': 'SITUATION DU PARC CAMIONS'},
        'BULLS': {'filter': Q(type_vehicule__icontains='BULL'), 'title': 'SITUATION DU PARC BULLS'},
        'MACHINES_DEFRUITAGE': {'filter': Q(type_vehicule__icontains='MACHINE') & Q(stade__icontains='Defruitage'), 'title': 'SITUATION DU PARC MACHINES DEFRUITAGE'},
        'MACHINES_DECAPAGE': {'filter': Q(type_vehicule__icontains='MACHINE') & Q(stade__icontains='Decapage'), 'title': 'SITUATION DU PARC MACHINES DECAPAGE'},
        'MACHINES_SONDEUSES': {'filter': Q(type_vehicule__icontains='MACHINE') & Q(stade__icontains='Forage'), 'title': 'SITUATION DU PARC MACHINES SONDEUSES'},
        'ENGIN': {'filter': Q(type_vehicule__icontains='ENGIN'), 'title': ' SITUATION DU PARC DIVERS'},
    }

    result = {}

    for key, config in categories.items():
        vehicules = Vehicule.objects.filter(config['filter']).order_by('modele')

        tableau_data = []
        for vehicule in vehicules:
            tickets_actifs = Ticket.objects.filter(
                vehicule=vehicule,
                statut__in=['NOUVEAU', 'RESOLU', 'EN_COURS']
            )

            causes = []
            gravites = []

            for ticket in tickets_actifs:
                # Anomalies standards actives
                anomalies_actives = ticket.anomalies.filter(est_active=True)
                causes.extend([a.nom for a in anomalies_actives])

                # Anomalies personnalisées
                if ticket.anomalies_personnalisees:
                    causes.append(ticket.anomalies_personnalisees)

                # ✅ Récupération de la gravité directement depuis le ticket
                if ticket.gravite:
                    gravites.append(ticket.gravite)

            if causes:
                tableau_data.append({
                    'modele': vehicule.modele,
                    'causes': ', '.join(causes),
                    'gravites': gravites  # ✅ Liste des gravités
                })

        result[key] = {
            'title': config['title'],
            'data': tableau_data
        }

    return Response(result)
