from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

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
    matricule = models.CharField(max_length=50)
    type_vehicule = models.CharField(max_length=50)
    marque = models.CharField(max_length=50)
    modele = models.CharField(max_length=50)
    date_mise_en_service = models.DateField()
    tonnage_max = models.FloatField(null=True, blank=True)
    en_service = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.matricule} - {self.marque} {self.modele}"


# ===================== Conducteur =====================

class Conducteur(models.Model):
    utilisateur = models.OneToOneField(Utilisateur, on_delete=models.CASCADE)
    vehicule = models.ForeignKey(Vehicule, on_delete=models.SET_NULL, null=True, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    date_poste = models.DateField()
    heure_debut = models.DateTimeField()
    heure_fin = models.DateTimeField()
    commentaire = models.TextField()

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.vehicule.matricule}"


# ===================== TypeAnomalie =====================

class TypeAnomalie(models.Model):
    nom = models.CharField(max_length=100)
    identifiant = models.IntegerField()
    description = models.TextField()
    gravite_par_defaut = models.CharField(max_length=50)
    type_vehicule_concerne = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.nom} - {self.type_vehicule_concerne}"


# ===================== Ticket =====================

class Ticket(models.Model):
    reference = models.CharField(max_length=100)
    description = models.TextField()
    gravite = models.CharField(max_length=50)
    statut = models.CharField(max_length=50)
    heure_creation = models.DateTimeField(auto_now_add=True)
    heure_modification = models.DateTimeField(auto_now=True)
    heure_cloture = models.DateTimeField(null=True, blank=True)
    date_creation = models.DateField(default=timezone.now)

    utilisateur_createur = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets_crees')
    utilisateur_assigne = models.ForeignKey(Utilisateur, on_delete=models.SET_NULL, null=True, blank=True, related_name='tickets_assignes')
    vehicule = models.ForeignKey(Vehicule, on_delete=models.SET_NULL, null=True, blank=True)

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
