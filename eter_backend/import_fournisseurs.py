import pandas as pd
import re
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.core.models import Fournisseur

class Command(BaseCommand):
    help = 'Importer les fournisseurs depuis un fichier Excel'

    def add_arguments(self, parser):
        parser.add_argument(
            'file_path',
            type=str,
            help='Chemin vers le fichier Excel contenant les fournisseurs'
        )
        parser.add_argument(
            '--sheet',
            type=str,
            default='0',
            help='Nom ou index de la feuille Excel (défaut: première feuille)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simulation sans insertion en base'
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='Mettre à jour les fournisseurs existants'
        )

    def handle(self, *args, **options):
        file_path = options['file_path']
        sheet = options['sheet']
        dry_run = options['dry_run']
        update_existing = options['update']

        self.stdout.write(f"📂 Lecture du fichier: {file_path}")
        
        try:
            # Lire le fichier Excel
            if sheet.isdigit():
                df = pd.read_excel(file_path, sheet_name=int(sheet))
            else:
                df = pd.read_excel(file_path, sheet_name=sheet)
                
        except FileNotFoundError:
            raise CommandError(f"❌ Fichier non trouvé: {file_path}")
        except Exception as e:
            raise CommandError(f"❌ Erreur lors de la lecture du fichier: {e}")

        # Vérifier les colonnes requises
        required_columns = ['raison social', 'adresse', 'téléphone', 'nif']
        df_columns_lower = [col.lower().strip() for col in df.columns]

        # Mapping des colonnes (gérer les variations)
        column_mapping = {}

        # Dictionnaire des synonymes
        synonymes = {
            'raison social': ['raison social', 'raison sociale', 'intitulé', 'nom', 'fournisseur'],
            'adresse': ['adresse', 'localisation', 'lieu'],
            'téléphone': ['téléphone', 'tel', 'mobile', ],
            'nif': ['nif', 'numéro fiscal', 'identification fiscale', 'identifiant fiscal'],
        }

        for req_col in required_columns:
            found = False
            possible_names = synonymes[req_col]
            for variant in possible_names:
                for df_col in df.columns:
                    if variant in df_col.lower().strip():
                        column_mapping[req_col] = df_col
                        found = True
                        break
                if found:
                    break
            if not found:
                raise CommandError(f"❌ Colonne manquante: '{req_col}'. Synonymes attendus: {possible_names}. Trouvées: {list(df.columns)}")
        self.stdout.write(f"✅ Colonnes détectées: {column_mapping}")
        self.stdout.write(f"📊 Nombre de lignes à traiter: {len(df)}")

        if dry_run:
            self.stdout.write(self.style.WARNING("🧪 Mode simulation activé - Aucune donnée ne sera sauvegardée"))

        # Statistiques
        stats = {
            'total': len(df),
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }

        # Traitement des données
        with transaction.atomic():
            for index, row in df.iterrows():
                try:
                    # Extraire les données
                    raison_sociale = str(row[column_mapping['raison social']]).strip()
                    adresse = str(row[column_mapping['adresse']]).strip()
                    telephone = str(row[column_mapping['téléphone']]).strip()
                    nif_raw = str(row[column_mapping['nif']]).strip()

                    # Valider les données obligatoires
                    if pd.isna(row[column_mapping['raison social']]) or not raison_sociale:
                        self.stdout.write(f"⚠️ Ligne {index + 2}: Raison sociale manquante - ignorée")
                        stats['skipped'] += 1
                        continue

                    if pd.isna(row[column_mapping['nif']]) or not nif_raw:
                        self.stdout.write(f"⚠️ Ligne {index + 2}: NIF manquant - ignorée")
                        stats['skipped'] += 1
                        continue

                    # Normaliser le NIF (extraire seulement les chiffres)
                    nif = re.sub(r'[^\d]', '', nif_raw)
                    
                    if len(nif) != 8:
                        self.stdout.write(f"⚠️ Ligne {index + 2}: NIF invalide '{nif_raw}' (doit contenir 8 chiffres) - ignorée")
                        stats['skipped'] += 1
                        continue

                    # Normaliser le téléphone
                    if pd.notna(row[column_mapping['téléphone']]) and telephone:
                        # Nettoyer le téléphone
                        telephone = re.sub(r'[^\d+]', '', telephone)
                        if telephone and not telephone.startswith('+222') and not telephone.startswith('222'):
                            if len(telephone) == 8:
                                telephone = f"+222{telephone}"
                            elif len(telephone) == 11 and telephone.startswith('222'):
                                telephone = f"+{telephone}"
                    else:
                        telephone = ""

                    # Nettoyer l'adresse
                    if pd.isna(row[column_mapping['adresse']]) or not adresse:
                        adresse = "Adresse non renseignée"

                    # Préparer les données du fournisseur
                    fournisseur_data = {
                        'raison_sociale': raison_sociale,
                        'adresse': adresse,
                        'telephone': telephone,
                        'nif': nif,
                        'contact_nom': raison_sociale,  # Utiliser la raison sociale comme nom de contact par défaut
                        'statut_kyc': 'EN_ATTENTE'
                    }

                    if dry_run:
                        self.stdout.write(f"🔍 Ligne {index + 2}: {raison_sociale} (NIF: {nif}) - Simulation OK")
                        stats['created'] += 1
                        continue

                    # Vérifier si le fournisseur existe
                    existing_fournisseur = None
                    try:
                        existing_fournisseur = Fournisseur.objects.get(nif=nif)
                    except Fournisseur.DoesNotExist:
                        pass

                    if existing_fournisseur:
                        if update_existing:
                            # Mettre à jour
                            for key, value in fournisseur_data.items():
                                setattr(existing_fournisseur, key, value)
                            existing_fournisseur.save()
                            self.stdout.write(f"🔄 Ligne {index + 2}: {raison_sociale} (NIF: {nif}) - Mis à jour")
                            stats['updated'] += 1
                        else:
                            self.stdout.write(f"⚠️ Ligne {index + 2}: Fournisseur existe déjà (NIF: {nif}) - Ignoré")
                            stats['skipped'] += 1
                    else:
                        # Créer nouveau fournisseur
                        fournisseur = Fournisseur(**fournisseur_data)
                        fournisseur.save()
                        self.stdout.write(f"✅ Ligne {index + 2}: {raison_sociale} (NIF: {nif}) - Créé")
                        stats['created'] += 1

                except Exception as e:
                    self.stdout.write(f"❌ Ligne {index + 2}: Erreur - {e}")
                    stats['errors'] += 1
                    continue

        # Afficher le résumé
        self.stdout.write("\n" + "="*50)
        self.stdout.write("📊 RÉSUMÉ DE L'IMPORT")
        self.stdout.write("="*50)
        self.stdout.write(f"📋 Total de lignes traitées: {stats['total']}")
        self.stdout.write(f"✅ Fournisseurs créés: {stats['created']}")
        self.stdout.write(f"🔄 Fournisseurs mis à jour: {stats['updated']}")
        self.stdout.write(f"⚠️ Lignes ignorées: {stats['skipped']}")
        self.stdout.write(f"❌ Erreurs: {stats['errors']}")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\n🧪 Mode simulation - Aucune donnée sauvegardée"))
        else:
            self.stdout.write(f"\n🎉 Import terminé! {stats['created'] + stats['updated']} fournisseurs traités.")

        # Afficher quelques exemples
        if not dry_run and (stats['created'] > 0 or stats['updated'] > 0):
            self.stdout.write("\n📝 Exemples de fournisseurs importés:")
            recent_fournisseurs = Fournisseur.objects.order_by('-created_at')[:5]
            for f in recent_fournisseurs:
                self.stdout.write(f"   • {f.raison_sociale} (NIF: {f.nif}) - {f.telephone}")
