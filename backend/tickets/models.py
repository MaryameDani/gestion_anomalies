from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import date

# ===================== Utilisateur =====================

class Utilisateur(AbstractUser):
    USER_TYPE_CHOICES = (
        ('PERMANENCIER_CAMION', 'Permanencier Camion'),
        ('PERMANENCIER_MACHINE', 'Permanencier Machine'),
        ('PERMANENCIER_MAINTENANCE_DRAGLINE', 'Permanencier Maintenancier Dragline'),
        ('PERMANENCIER_MAINTENANCE_ENGINS', 'Permanencier Maintenancier Engins'),
        ('MAINTENANCIER', 'Maintenancier'),
        ('ADMINISTRATEUR', 'Administrateur'),
    )
    
    phone = models.CharField(max_length=15, blank=True, null=True)
    birth_date = models.DateField(blank=True, null=True)
    user_type = models.CharField(max_length=50, choices=USER_TYPE_CHOICES)
    
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        related_name='utilisateur_set',  
        related_query_name='utilisateur'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        related_name='utilisateur_set', 
        related_query_name='utilisateur'
    )

    def is_administrateur(self):
        return self.user_type == 'ADMINISTRATEUR'
    
    def is_permanencier_camion(self):
        return self.user_type == 'PERMANENCIER_CAMION'
    
    def is_permanencier_machine(self): 
        return self.user_type == 'PERMANENCIER_MACHINE'
    
    def is_permanencier_maintenance_dragline(self):
        return self.user_type == 'PERMANENCIER_MAINTENANCE_DRAGLINE'
    
    def is_permanencier_maintenance_engins(self):
        return self.user_type == 'PERMANENCIER_MAINTENANCE_ENGINS'
    
    def is_maintenancier(self):
        return self.user_type == 'MAINTENANCIER'


# ===================== Vehicule =====================

class Vehicule(models.Model):
    type_vehicule = models.CharField(max_length=50)
    modele = models.CharField(max_length=50,unique=True)
    en_service = models.BooleanField(default=True)
    stade = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.type_vehicule} {self.modele}"


# ===================== Conducteur =====================

class Conducteur(models.Model):
    PREMIER_POSTE = 1
    DEUXIEME_POSTE = 2
    TROISIEME_POSTE = 3

    POST_CHOICES = [
        (PREMIER_POSTE, 'Premier poste'),
        (DEUXIEME_POSTE, 'Deuxième poste'),
        (TROISIEME_POSTE, 'Troisième poste'),
    ]
    
    vehicule = models.ForeignKey(Vehicule, on_delete=models.SET_NULL, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    date_poste = models.DateField()
    heures_travaillees = models.FloatField(default=0)
    heure_debut = models.DateTimeField()
    heure_fin = models.DateTimeField()
    heure_de_fin_du_compteur= models.FloatField(default=0)
    commentaire = models.TextField()
    poste = models.CharField(max_length=100, choices=POST_CHOICES, default=PREMIER_POSTE)

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.vehicule}"


# ===================== TypeAnomalie =====================

class TypeAnomalie(models.Model):
    TYPE_VEHICULE_CHOICES = (
        ('CAMION', 'Camion'),
        ('MACHINE', 'Machine'),
        ('ENGINS', 'Engins'),
        ('BULL', 'Bull'),
        
    )
    
    GRAVITE_CHOICES = (
        ('LEGERE', 'Légère'),
        ('MOYENNE', 'Moyenne'),
        ('GRAVE', 'Grave'),
        ('CRITIQUE', 'Critique'),
    )
    
    nom = models.CharField(max_length=100)
    identifiant = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    gravite_par_defaut = models.CharField(max_length=50, choices=GRAVITE_CHOICES, default='MOYENNE')
    type_vehicule_concerne = models.CharField(max_length=50, choices=TYPE_VEHICULE_CHOICES)
    est_personnalisee = models.BooleanField(default=False)
    est_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nom} - {self.type_vehicule_concerne}"


# ===================== Ticket =====================

class Ticket(models.Model):
    STATUT_CHOICES = (
        ('NOUVEAU', 'Nouveau'),
        ('EN_COURS', 'En cours'),
        ('RESOLU', 'Résolu'),
        ('CLOTURE', 'Clôturé'),
    )
    
    anomalies = models.ManyToManyField(TypeAnomalie, related_name='tickets', blank=True)
    reference = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    gravite = models.CharField(max_length=50, choices=TypeAnomalie.GRAVITE_CHOICES)
    statut = models.CharField(max_length=50, choices=STATUT_CHOICES, default='NOUVEAU')
    heure_creation = models.DateTimeField(default=timezone.now, blank=True, null=True)
    heure_modification = models.DateTimeField(auto_now=True)
    heure_cloture = models.DateTimeField(null=True, blank=True)
    date_creation = models.DateField(default=date.today)
    poste = models.CharField(max_length=100, choices=Conducteur.POST_CHOICES, default=Conducteur.PREMIER_POSTE)

    utilisateur_createur = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets_crees')
    utilisateur_assigne = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets_assignes')
    utilisateur_assigne_maintenance = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets_assignes_maintenance')
    vehicule = models.ForeignKey(Vehicule, on_delete=models.SET_NULL, null=True, blank=True)
    anomalies_personnalisees = models.TextField(blank=True)  # Pour stocker les pannes personnalisées

    def save(self, *args, **kwargs):
        if not self.reference:
            # Génération automatique de la référence
            date_part = timezone.now().strftime('%Y%m%d')
            last_ticket = Ticket.objects.filter(reference__startswith=f'TICK-{date_part}').order_by('reference').last()
            if last_ticket:
                last_num = int(last_ticket.reference.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            self.reference = f'TICK-{date_part}-{new_num:04d}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Ticket {self.reference} - {self.statut}"


# ===================== ArretVehicule =====================

class ArretVehicule(models.Model):
    vehicule = models.ForeignKey(Vehicule, on_delete=models.SET_NULL, null=True, blank=True)
    type_arret = models.CharField(max_length=100)
    heure_debut = models.DateTimeField()
    heure_fin = models.DateTimeField(null=True, blank=True)
    description = models.TextField()
    date_determination = models.DateTimeField(default=timezone.now)
    taux_utilisation = models.FloatField(default=0)
    taus_disponibilite = models.FloatField(default=0)

    ticket = models.ForeignKey(Ticket, on_delete=models.SET_NULL, null=True, blank=True, related_name='arrets')

    def __str__(self):
        return f"Arret de {self.vehicule} - {self.type_arret}"


# ===================== TonnagePrediction =====================

class TonnagePrediction(models.Model):
    vehicule = models.ForeignKey(Vehicule, on_delete=models.SET_NULL, null=True, blank=True)
    date_prediction = models.DateField(default=timezone.now)
    tonnage_prevu = models.FloatField()

    def __str__(self):
        return f"Tonnage prévu pour {self.vehicule} - {self.tonnage_prevu} tonnes"


# ===================== GravitePrediction =====================

class GravitePrediction(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE)
    gravite_predite = models.CharField(max_length=50)
    date_prediction = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Prédiction de gravité pour {self.ticket} - {self.gravite_predite}"
