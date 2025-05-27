from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # Authentification et utilisateurs
    path('api/login/', views.login_view, name='login'),
    path('api/logout/', views.logout_view, name='logout'),
    path('api/user-info/', views.get_utilisateur_info, name='user-info'), 
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Tickets
    path('api/tickets/', views.creer_ticket, name='creer_ticket'),
    path('api/tickets/suivre/', views.suivre_tickets, name='suivre_tickets'), 
    path('api/tickets/<int:ticket_id>/changer_statut/', views.changer_statut_ticket, name="changer_statut_ticket"),
    path('api/tickets/<int:ticket_id>/assigner/', views.assigner_ticket, name='assigner_ticket'),
    path('api/utilisateurs-par-type/', views.lister_utilisateurs_par_type, name='lister_utilisateurs_par_type'),
    path('api/tickets/<int:ticket_id>/assigner_maintenance/', views.assigner_ticket_maintenance, name='assigner_ticket_maintenance'),
    
    # Pannes et véhicules
    path('api/pannes/', views.lister_pannes, name='lister_pannes'), 
    path('api/vehicules/', views.lister_vehicules, name='lister_vehicules'), 
    
    #Formulaire de fin de poste 
    path('api/fin-poste/', views.creer_formulaire_fin_poste, name='creer_formulaire_fin_poste'),
    path('api/activite/vehicules/', views.film_activite_vehicules, name='film_activite_vehicules'),
    path('api/formulaire/pannes/', views.enregistrer_pannes_formulaire, name='enregistrer_pannes_formulaire'),
    
    #Historique des tickets
    path('api/tableau-arrets/', views.tableau_arrets, name='tableau_arrets'),
    path('api/ticket/<int:ticket_id>/modifier-heures/', views.modifier_heures_ticket, name='modifier_heures_ticket'),

    # Dashboard
    path('api/situation_parc/', views.situation_parc, name='situation_parc'),
]
