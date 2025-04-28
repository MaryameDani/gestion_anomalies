from rest_framework import serializers
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
    utilisateur = UtilisateurSerializer(read_only=True)
    vehicule = VehiculeSerializer(read_only=True)

    class Meta:
        model = Conducteur
        fields = '__all__'

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

    class Meta:
        model = Ticket
        fields = '__all__'

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
