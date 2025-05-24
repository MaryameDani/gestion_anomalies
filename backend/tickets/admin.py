from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    Utilisateur,
    Vehicule,
    Conducteur,
    TypeAnomalie,
    Ticket,
    ArretVehicule,
    TonnagePrediction,
    GravitePrediction,
)

# Personnalisation de l'admin pour le modèle Utilisateur
class UtilisateurAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'user_type', 'is_staff', 'is_active', 'date_joined')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Informations personnelles', {'fields': ('first_name', 'last_name', 'email', 'phone', 'birth_date', 'user_type')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates importantes', {'fields': ('last_login', 'date_joined')}),
    )
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'user_type', 'groups')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'phone')
    ordering = ('username',)
    filter_horizontal = ('groups', 'user_permissions')

admin.site.register(Utilisateur, UtilisateurAdmin)

# Admin pour le modèle Vehicule
class VehiculeAdmin(admin.ModelAdmin):
    list_display = ('type_vehicule',  'modele', 'en_service')
    list_filter = ('type_vehicule', 'en_service')
    search_fields = ('type_vehicule','modele')

admin.site.register(Vehicule, VehiculeAdmin)

# Admin pour le modèle Conducteur
class ConducteurAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'phone', 'vehicule', 'date_poste')
    search_fields = ('first_name', 'last_name', 'vehicule__matricule')
    list_filter = ('vehicule__type_vehicule', 'date_poste')

admin.site.register(Conducteur, ConducteurAdmin)

# Admin pour le modèle TypeAnomalie
class TypeAnomalieAdmin(admin.ModelAdmin):
    list_display = ('nom', 'identifiant', 'gravite_par_defaut', 'type_vehicule_concerne')
    list_filter = ('gravite_par_defaut', 'type_vehicule_concerne')
    search_fields = ('nom', 'description')

admin.site.register(TypeAnomalie, TypeAnomalieAdmin)

# Admin pour le modèle Ticket
class TicketAdmin(admin.ModelAdmin):
    list_display = ('reference', 'description', 'gravite', 'statut', 'date_creation', 'heure_creation', 'utilisateur_createur', 'utilisateur_assigne', 'vehicule')
    list_filter = ('gravite', 'statut', 'date_creation', 'vehicule')
    search_fields = ('reference', 'description', 'utilisateur_createur__username', 'utilisateur_assigne__username', 'vehicule__matricule')
    raw_id_fields = ('utilisateur_createur', 'utilisateur_assigne', 'vehicule')
    date_hierarchy = 'date_creation' # Permet de naviguer par date

admin.site.register(Ticket, TicketAdmin)

# Admin pour le modèle ArretVehicule
class ArretVehiculeAdmin(admin.ModelAdmin):
    list_display = ('vehicule', 'type_arret', 'heure_debut', 'heure_fin', 'date_determination', 'ticket')
    list_filter = ('type_arret', 'date_determination', 'vehicule')
    search_fields = ('vehicule__matricule', 'description', 'ticket__reference')
    raw_id_fields = ('vehicule', 'ticket')
    date_hierarchy = 'date_determination'

admin.site.register(ArretVehicule, ArretVehiculeAdmin)

# Admin pour le modèle TonnagePrediction
class TonnagePredictionAdmin(admin.ModelAdmin):
    list_display = ('vehicule', 'date_prediction', 'tonnage_prevu')
    list_filter = ('date_prediction', 'vehicule')
    search_fields = ('vehicule__matricule',)
    date_hierarchy = 'date_prediction'

admin.site.register(TonnagePrediction, TonnagePredictionAdmin)

# Admin pour le modèle GravitePrediction
class GravitePredictionAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'gravite_predite', 'date_prediction')
    list_filter = ('gravite_predite', 'date_prediction')
    search_fields = ('ticket__reference',)
    raw_id_fields = ('ticket',)
    date_hierarchy = 'date_prediction'

admin.site.register(GravitePrediction, GravitePredictionAdmin)