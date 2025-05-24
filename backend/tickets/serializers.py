from rest_framework import serializers
from datetime import datetime
from django.contrib.auth import get_user_model
from .models import (
    Vehicule, Conducteur, TypeAnomalie, Ticket,
    ArretVehicule, TonnagePrediction, GravitePrediction
)
import pytz

Utilisateur = get_user_model()

# ===================== Utilisateur =====================
class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'phone', 'birth_date',
            'user_type', 'first_name', 'last_name'
        ]

# ===================== Vehicule =====================
class VehiculeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicule
        fields = '__all__'

# ===================== Conducteur =====================
class ConducteurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conducteur
        fields = ['id', 'vehicule', 'first_name', 'last_name', 'phone','poste', 'date_poste', 'heure_debut', 'heure_fin', 'commentaire']

# ===================== TypeAnomalie =====================
class TypeAnomalieSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeAnomalie
        fields = '__all__'

# ===================== Ticket =====================

class TicketSerializer(serializers.ModelSerializer):
    utilisateur_createur = UtilisateurSerializer(read_only=True)
    utilisateur_assigne = UtilisateurSerializer(read_only=True)
    vehicule = VehiculeSerializer(read_only=True)
    anomalies = TypeAnomalieSerializer(many=True, read_only=True)
    anomalies_personnalisees = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = Ticket
        fields = ['id', 'reference', 'vehicule', 'anomalies', 'anomalies_personnalisees', 'description', 'gravite', 'statut', 'poste','heure_creation', 'heure_modification', 'heure_cloture', 'date_creation', 'utilisateur_createur', 'utilisateur_assigne']

    def create(self, validated_data):
        """
        Méthode pour gérer l'ajout des anomalies personnalisées et des anomalies prédéfinies lors de la création d'un ticket.
        """
        anomalies_data = validated_data.pop('anomalies', [])
        
        # Extraire seulement la date pour le champ date_creation
        date_creation = validated_data.get('date_creation', None)
        if isinstance(date_creation, datetime):
            validated_data['date_creation'] = date_creation.date()  # Ne garder que la date sans l'heure

        ticket = Ticket.objects.create(**validated_data)
        
        # Ajout des anomalies prédéfinies
        ticket.anomalies.set(anomalies_data)

        # Si des anomalies personnalisées sont ajoutées
        anomalies_personnalisees = validated_data.get('anomalies_personnalisees', '')
        ticket.anomalies_personnalisees = anomalies_personnalisees
        ticket.save()
        
        return ticket
    
class TicketDetailSerializer(serializers.ModelSerializer):
    # Inclure les anomalies avec tous leurs détails
    anomalies = TypeAnomalieSerializer(many=True, read_only=True)
    
    # Inclure aussi les anomalies personnalisées sous forme de texte
    anomalies_personnalisees_texte = serializers.CharField(source='anomalies_personnalisees', read_only=True)
    
    class Meta:
        model = Ticket
        fields = ['id', 'reference', 'description', 'gravite', 'statut', 
                  'heure_creation', 'heure_modification', 'heure_cloture', 
                  'date_creation', 'poste', 'utilisateur_createur', 
                  'utilisateur_assigne','utilisateur_assigne_maintenance',
                  'vehicule', 'anomalies', 'anomalies_personnalisees',
                  'anomalies_personnalisees_texte','description']
        
class TicketUpdateHeuresSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ['id','heure_creation', 'heure_cloture']
    def to_internal_value(self, data):
        # Appeler la méthode parente pour la conversion initiale
        modified_data = super().to_internal_value(data)

        # Définir le fuseau horaire local attendu de l'entrée du frontend.
        # Basé sur votre emplacement actuel (Khouribga, Maroc), 'Africa/Casablanca' est approprié.
        # Vous pouvez le définir dans settings.py pour une meilleure gestion :
        # LOCAL_DISPLAY_TIME_ZONE = 'Africa/Casablanca'
        # puis l'utiliser ici avec pytz.timezone(settings.LOCAL_DISPLAY_TIME_ZONE)
        local_timezone = pytz.timezone('Africa/Casablanca') # Ou la valeur de settings.LOCAL_DISPLAY_TIME_ZONE

        # Traiter 'heure_creation'
        if 'heure_creation' in modified_data and modified_data['heure_creation']:
            # Supprimer toute information de fuseau horaire existante pour la rendre "naïve"
            naive_dt_creation = modified_data['heure_creation'].replace(tzinfo=None)
            # Localiser la date/heure naïve dans le fuseau horaire local
            local_aware_dt_creation = local_timezone.localize(naive_dt_creation, is_dst=None)
            # Convertir cette date/heure locale en UTC pour le stockage dans la base de données
            modified_data['heure_creation'] = local_aware_dt_creation.astimezone(pytz.utc)

        # Traiter 'heure_cloture' avec la même logique
        if 'heure_cloture' in modified_data and modified_data['heure_cloture']:
            naive_dt_cloture = modified_data['heure_cloture'].replace(tzinfo=None)
            local_aware_dt_cloture = local_timezone.localize(naive_dt_cloture, is_dst=None)
            modified_data['heure_cloture'] = local_aware_dt_cloture.astimezone(pytz.utc)

        return modified_data

# ===================== ArretVehicule =====================
class ArretVehiculeSerializer(serializers.ModelSerializer):
    vehicule = VehiculeSerializer(read_only=True)
    ticket = TicketSerializer(read_only=True)

    class Meta:
        model = ArretVehicule
        fields = '__all__'

# ===================== TonnagePrediction =====================
class TonnagePredictionSerializer(serializers.ModelSerializer):
    vehicule = VehiculeSerializer(read_only=True)

    class Meta:
        model = TonnagePrediction
        fields = '__all__'

# ===================== GravitePrediction =====================
class GravitePredictionSerializer(serializers.ModelSerializer):
    ticket = TicketSerializer(read_only=True)

    class Meta:
        model = GravitePrediction
        fields = '__all__'
        
# ===================== TypeAnomalie Serializer =====================
class TypeAnomalieSerializer(serializers.ModelSerializer):
    class Meta:
        model = TypeAnomalie
        fields = ['id', 'nom', 'identifiant', 'description', 'gravite_par_defaut', 
                  'type_vehicule_concerne', 'est_personnalisee', 'est_active']

# ===================== Tableau Arrêts Serializer =====================
class TableauArretSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    vehicule_modele = serializers.CharField()
    type_arret = serializers.CharField()
    heure_creation = serializers.DateTimeField()
    heure_cloture = serializers.DateTimeField(allow_null=True)
    
