
Carte interactive des précipitations et températures mesurées dans plusieurs stations météorologiques à La Réunion
============================================================================

1. Description du projet
Le script Python permet de créer une carte interactive Folium combinant :
- Les précipitations moyennes annuelles par commune de La Réunion (affichage temporel de 2020 à 2024).
- Les températures minimales et maximales mesurées dans plusieurs stations météorologiques.

Le rendu final (PrecipitaionEtTemperature.html) affiche :
Un fond de carte (OpenTopoMap ou CartoDB Positron)
- Les communes colorées selon les précipitations (animation temporelle)
- Les stations météo avec leurs températures (boîtes rectangulaires blanches)
- Le contrôle de couches interactif

2. les bibliothèques nécessaires 
Installer les bibliothéques par:
pip install geopandas pandas mapclassify branca

- folium.plugins.TimestampedGeoJson : animation temporelle
- mapclassify.NaturalBreaks : classification des valeurs (méthode de Jenks)
- branca.colormap : création d’échelles de couleurs

3. Données nécessaires
Placer dans le même dossier le shapefile des communes de La Réunion :
    reunion_communesFrance4326.shp
et ses fichiers associés (.dbf, .shx, .prj…)
Les données de precipitations sont sur worldClim 
Les données de dtations météo sont sur https://meteofrance.re

Le chemin vers ce fichier est défini dans le code :
    chemin_shp = r"C:\Users\Etudiant\Desktop\PythonProject\shapefileCommuneReunion\reunion_communesFrance4326.shp""
--> Modifie-le selon le chemin réel sur dans l'ordinateur.

Le shapefile doit contenir :
- une colonne NOM (nom de la commune)
- les colonnes de précipitations : Mean_2020, MEAN_2021, MEAN_2022, MEAN_2023, MEAN_2024

4. Navigation sur la carte
- Activer/désactiver les calques via le panneau en haut à droite.
- Animation temporelle : clique sur “Play” pour faire défiler les années.
- Températures : affichées en rectangles blancs sur chaque station.
- Communes : survoler pour voir le nom et la valeur des précipitations.
- Légende bleue : indique la quantité moyenne annuelle de pluie (mm/an).

5. Résultat
----------------------------------------------
Le fichier final PrecipitaionEtTemperature.html présente :
- Une carte interactive animée par année (2020–2024),
- Les précipitations colorées par commune,
- Les températures affichées pour chaque station,
- Une interface claire et dynamique, adaptée à la visualisation scientifique.
