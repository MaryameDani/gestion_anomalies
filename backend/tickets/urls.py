from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('api/login/', views.login_view, name='login'),
    path('api/logout/', views.logout_view, name='logout'),
    path('api/user-info/', views.get_utilisateur_info_by_role, name='user-info'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/user-info/', views.get_utilisateur_info, name='get_user_info'),
    
    #Tickets 
    path('api/tickets/', views.creer_ticket, name='creer_ticket'),
    path('api/tickets/suivre/',views.suivre_tickets,name='suivre_ticket'),
    path('api/tickets/<ticket_id>/changer_statut/',views.changer_statut_ticket,name="changer_statut_ticket"),
    path('api/tickets/<int:ticket_id>/assigner/', views.assigner_ticket, name='assigner_ticket'),
]
