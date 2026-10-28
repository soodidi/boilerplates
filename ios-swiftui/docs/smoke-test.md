# Smoke test avant soumission (GLB-009)

À dérouler sur la matrice minimale : version d'iOS minimale supportée, dernière version d'iOS, un petit iPhone, un grand iPhone (et un iPad si supporté).

- [ ] L'app démarre sans crash, en mode clair et sombre
- [ ] Connexion : mauvais mot de passe → message générique ; bon mot de passe → notes ; la session survit au redémarrage de l'app
- [ ] Inscription et mot de passe oublié : e-mail reçu, lien ouvert sur le front web, retour à la connexion
- [ ] Déconnexion : retour à la connexion, aucune donnée du compte précédent visible
- [ ] Liste des notes : chargement, recherche, tirer pour rafraîchir
- [ ] Création d'une note : titre vide refusé, note ajoutée et annoncée par VoiceOver
- [ ] Mode avion : message d'erreur et bouton Réessayer
- [ ] Taille de texte maximale (Dynamic Type) : rien n'est tronqué ni superposé
- [ ] VoiceOver : chaque élément est lisible et activable
