from rest_framework import serializers
from datetime import datetime
from django.contrib.auth import get_user_model
from .models import (
    Vehicule, Conducteur, TypeAnomalie, Ticket,
    ArretVehicule, TonnagePrediction, GravitePrediction
)

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
        fields = ['id', 'utilisateur', 'vehicule', 'first_name', 'last_name', 'phone', 'date_poste', 'heure_debut', 'heure_fin', 'commentaire']

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
    type_anomalies = TypeAnomalieSerializer(many=True, read_only=True)
    anomalies_personnalisees = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = Ticket
        fields = ['id', 'reference', 'vehicule', 'type_anomalies', 'anomalies_personnalisees', 'description', 'gravite', 'statut', 'heure_creation', 'heure_modification', 'heure_cloture', 'date_creation', 'utilisateur_createur', 'utilisateur_assigne']

    def create(self, validated_data):
        """
        Méthode pour gérer l'ajout des anomalies personnalisées et des anomalies prédéfinies lors de la création d'un ticket.
        """
        anomalies_data = validated_data.pop('type_anomalies', [])
        
        # Extraire seulement la date pour le champ date_creation
        date_creation = validated_data.get('date_creation', None)
        if isinstance(date_creation, datetime):
            validated_data['date_creation'] = date_creation.date()  # Ne garder que la date sans l'heure

        ticket = Ticket.objects.create(**validated_data)
        
        # Ajout des anomalies prédéfinies
        ticket.type_anomalies.set(anomalies_data)

        # Si des anomalies personnalisées sont ajoutées
        anomalies_personnalisees = validated_data.get('anomalies_personnalisees', '')
        ticket.anomalies_personnalisees = anomalies_personnalisees
        ticket.save()
        
        return ticket


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
