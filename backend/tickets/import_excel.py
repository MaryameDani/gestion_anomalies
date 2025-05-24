import pandas as pd
from tickets.models import Vehicule

def importer_vehicules(fichier_excel):
    df = pd.read_excel(fichier_excel)

    for _, row in df.iterrows():
        modele = row['modele']
        stade = row['stade']
        type_vehicule = row['type_vehicule']

        Vehicule.objects.update_or_create(
            modele=modele,
            defaults={
                'type_vehicule': type_vehicule,
                'stade': stade,
                'en_service': True
            }
        )
