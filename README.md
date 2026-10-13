# Site RUN & GUN · Norta Films

Le site de la campagne Run & Gun, saison 01. C'est une seule page statique. Les candidatures sont enregistrées dans l'app de pilotage de l'équipe (voir partie 3).

## Ce qu'il y a dans le dossier

```
06-site-web/
├── index.html      la page (sections, formulaire, balises de référencement, données structurées JSON-LD)
├── 404.html        page d'erreur utile (noindex)
├── sitemap.xml     plan du site pour Google et Bing
├── robots.txt      règles d'exploration (+ adresse du sitemap)
├── manifest.webmanifest   nom et icônes du site
├── css/style.css   le style
├── js/config.js    LES RÉGLAGES À REMPLIR (numéro WhatsApp, e-mail…)
├── js/form.js      le formulaire de candidature
├── js/main.js      les animations et la vidéo en plein écran
├── video/          les boucles muettes des cartes clips (mp4)
├── img/            les photos (en .webp, avec une version 800 px), les .jpg d'origine (miniatures de données structurées), le logo, l'icône, l'image de partage
└── .nojekyll       dit à GitHub Pages de servir les fichiers tels quels
```

**Site en ligne : https://tanorfall.github.io/run-and-gun/** (voir la partie 4).

## 1. Ouvrir le site sur ton ordinateur

Le plus simple : double-clique sur `index.html`. Le site s'ouvre dans ton navigateur.

Pour le voir exactement comme en ligne (conseillé avant de publier), ouvre le Terminal et tape :

```
cd "/Users/macbookpro/Desktop/RUN & GUN - Norta Films/06-site-web"
node "/Users/macbookpro/Desktop/RUN & GUN - Norta Films/05-sources/tools/serve-static.mjs" . 8765
```

Puis va sur http://localhost:8765 dans ton navigateur. Pour arrêter : `Ctrl + C` dans le Terminal.

## 2. Remplir `js/config.js` (obligatoire avant la mise en ligne)

Ouvre `js/config.js` avec TextEdit (ou n'importe quel éditeur de texte) et remplace les valeurs entre apostrophes :

| Réglage | À mettre | Exemple |
|---|---|---|
| `NORTA_WHATSAPP` | Le numéro WhatsApp de Norta, avec 221 devant, **chiffres seulement** (pas de +, pas d'espaces, pas de 0 devant) | `'221771234567'` |
| `NORTA_EMAIL` | L'adresse e-mail qui reçoit les candidatures | `'candidatures@nortafilms.com'` |
| `FORM_ENDPOINT` | L'adresse de l'app de pilotage qui enregistre les candidatures. Par défaut `'http://localhost:3100/api/candidature'` (aperçu local). **En production : `'https://<adresse-de-l-app>/api/candidature'`** | `'https://<adresse-de-l-app>/api/candidature'` |
| `NORTA_INSTAGRAM` | Le compte Instagram, sans @ | `'norta_films'` |

Tant que le numéro et l'e-mail ne sont pas remplis, le site le signale à l'artiste après l'envoi et lui propose de copier sa candidature pour l'envoyer en DM sur Instagram. Le lien WhatsApp du bas de page reste masqué tant que le numéro est vide.

## 3. Comment fonctionne le formulaire

Quand un artiste clique sur « Envoyer ma candidature » :

1. Le site vérifie chaque champ et affiche des messages clairs en cas d'erreur (champ vide, numéro ou e-mail mal écrit, lien qui ne commence pas par https://, aucun réseau, cases non cochées).
2. **Le morceau** : l'artiste envoie **soit le fichier audio, soit un lien** (Audiomack, SoundCloud, Drive…). Au moins un des deux est obligatoire.
   - Formats acceptés : **MP3, WAV, M4A/AAC, OGG, FLAC**.
   - **10 Mo maximum.** Au-delà, le site refuse le fichier et conseille d'exporter en MP3 320 kbps (un titre de 4 min fait environ 9,5 Mo) ou d'envoyer un lien.
   - Zone de dépôt (glisser-déposer ou bouton « Choisir un fichier »), avec le nom, la taille, une pré-écoute et un bouton pour retirer le fichier.
3. Si tout est bon, la candidature (et le fichier) est envoyée à **l'app de pilotage** de l'équipe (`09-app-pilotage`), à l'adresse `FORM_ENDPOINT`. Une barre de progression montre l'envoi en %. L'artiste voit ensuite « Candidature reçue » avec son **numéro de candidature**.
4. Si l'app renvoie une erreur sur un champ, le message s'affiche sous le bon champ. Trop d'envois d'affilée (limite de débit) : l'artiste est invité à réessayer dans quelques minutes.
5. **Repli** : si `FORM_ENDPOINT` est vide, si l'app est injoignable (réseau, serveur arrêté), en panne ou si le formulaire public est désactivé, le site propose les anciens boutons :
   - **Envoyer sur WhatsApp**, **Envoyer par e-mail** (message déjà écrit), **Copier le message** ;
   - et précise que **le fichier audio ne passe pas par là** : il faut l'envoyer en DM sur Instagram (ou ajouter un lien). Un bouton « Réessayer l'envoi en ligne » permet de retenter.

### Ce que reçoit l'app (pour l'équipe technique)

`POST FORM_ENDPOINT` en `multipart/form-data`, champs : `nom_artiste`, `nom`, `ville`, `whatsapp`, `email`, `genre`, `son_url`, `presentation` (500 caractères max), `instagram`, `tiktok`, `youtube`, `autre_reseau`, `video_url`, `engagement` (« oui »), `consentement` (« oui »), `website` (anti-robot, vide) et le fichier `son_fichier`. Réponses attendues : `201 {"ok":true,"id":"..."}`, `400 {"ok":false,"erreurs":{"champ":"message"}}`, `413` (fichier trop lourd), `429` (limite de débit), `403`/`404` (formulaire désactivé).

Le site affiche une barre de progression : le navigateur fait donc d'abord une requête `OPTIONS` (CORS). L'app doit y répondre et autoriser l'adresse du site (`Access-Control-Allow-Origin`).

### En production

1. Mets l'app de pilotage en ligne, en **https**.
2. Dans `js/config.js`, remplace `FORM_ENDPOINT` par `'https://<adresse-de-l-app>/api/candidature'`.
3. Autorise l'adresse du site en ligne dans la configuration CORS de l'app.

Si tu oublies l'étape 2, rien ne casse : en ligne, le site ignore une adresse « localhost » et propose directement WhatsApp / e-mail.

Un champ caché anti-robot est déjà en place.

## 4. Mettre le site en ligne

### Production actuelle : GitHub Pages

- Adresse : **https://tanorfall.github.io/run-and-gun/**
- Dépôt (public) : https://github.com/tanorfall/run-and-gun, branche `main`, dossier racine. Le dépôt ne contient que le contenu de `06-site-web/`.
- Tous les chemins du site sont relatifs : il fonctionne sous `/run-and-gun/` sans réglage.

**Republier après une modification** : depuis le dossier `06-site-web`, dans le Terminal :

```
git add -A
git commit -m "Ce que tu as changé"
git push
```

GitHub Pages remet le site à jour en une minute environ. Pour changer `NORTA_WHATSAPP`, `NORTA_EMAIL` ou `FORM_ENDPOINT`, modifie `js/config.js` (partie 2) puis fais le même `git add` / `git commit` / `git push`. Ces valeurs sont publiques : n'y mets jamais de mot de passe ni de clé secrète.

### Autres hébergeurs (si besoin un jour)

#### Avec Netlify (glisser-déposer)

1. Va sur https://app.netlify.com/drop et crée un compte gratuit si besoin.
2. Glisse **le dossier `06-site-web` entier** dans la zone prévue.
3. En quelques secondes, Netlify te donne une adresse du type `https://nom-au-hasard.netlify.app`. Tu peux la renommer dans « Site configuration > Change site name » (par exemple `runandgun-norta`).

Pour mettre à jour : dans ton site sur Netlify, onglet « Deploys », glisse à nouveau le dossier.

#### Avec Vercel

1. Va sur https://vercel.com, crée un compte, puis « Add New… > Project ».
2. Choisis l'import d'un dossier (ou installe l'outil `vercel` et tape `vercel` dans le dossier `06-site-web`).
3. Pas de réglage à faire : c'est un site statique, laisse les options par défaut.

### L'image de partage

L'image qui s'affiche quand on partage le lien sur WhatsApp, Instagram ou Facebook est `img/og-run-and-gun.jpg`. Les lignes `og:image`, `twitter:image`, `og:url` et `canonical` de `index.html` pointent déjà vers l'adresse complète `https://tanorfall.github.io/run-and-gun/`. Si le site change d'adresse (autre hébergeur, nom de domaine), remplace cette adresse dans ces quatre lignes.

## 5. Modifier les textes ou les vidéos

- Les textes sont dans `index.html`, section par section (chaque section commence par un commentaire `<!-- ============ ... -->`).
- **Le prix** (150 000 FCFA, « 150K ») apparaît dans `index.html` (titre et carte du deal, encadré « Pas payé, pas confirmé », étape 3, mini-liste et case du formulaire, FAQ) et dans `js/form.js` (message WhatsApp / e-mail). Pour le changer, cherche « 150 » dans ces deux fichiers.
- **Les clips** : la section ne présente que des clips musicaux. Chaque carte a un attribut `data-video="youtube:ID"` ; la vidéo s'ouvre dans la fenêtre en plein écran (`youtube-nocookie.com`). Pour ajouter un clip, copie une carte et change l'ID YouTube (la partie après `v=` ou `youtu.be/`), le titre et l'image. La miniature est **stockée dans `img/`** pour ne pas dépendre d'un site tiers : télécharge `https://i.ytimg.com/vi/ID/maxresdefault.jpg` (repli : `hqdefault.jpg`), enregistre-la en JPEG dans `img/` (par exemple `img/clip-artiste-titre.jpg`) et mets ce chemin dans la carte. Pense à mettre à jour le compteur « Clips à regarder » et la liste des artistes de la bande défilante (section « Qui tourne »). Le clip One Lyrical est lu depuis Google Drive (`data-video="drive:ID"`) : le fichier doit rester partagé « Tous les utilisateurs disposant du lien ».
- Clips affichés (bento, 7 cartes) : One Lyrical « Promo » (grande carte), Keulthieu « L.B.L.D », Calail Christ « PLATA », Mika Tawou « Demb, Boomrang #1 », Le Dôgô « KARAKO » (feat. Starkingboycrak), Xhalil Xms « I Know », Mnsieur Kash « Développe ».
- **Lecture automatique, muette, en boucle** : chaque carte joue sans son quand elle est à l'écran ; le clic ouvre la fenêtre vidéo avec le son. Au survol (souris), la carte affiche titre, artiste, année et « Voir avec le son ». Rien ne joue si le visiteur a demandé « réduire les animations », a activé l'économiseur de données ou a une connexion très lente : les affiches restent fixes. Au plus 3 lectures en même temps sur mobile (4 sur ordinateur). Le code est dans `js/main.js` (section « bento des clips ») et `css/style.css` (section « 4. CLIPS »).
- **Remplacer une boucle** (One Lyrical et Keulthieu, fichiers dans `video/`) : prépare un MP4 H.264 **muet**, 6 à 10 secondes, 1280×720, **2,5 Mo maximum**, avec l'option « optimiser pour le web » (le bloc `moov` en tête de fichier). Remplace le fichier du même nom dans `video/`, puis remplace l'affiche `img/poster-one-lyrical.jpg` ou `img/poster-keulthieu-lbld.jpg` par la première image de la nouvelle boucle (JPEG, 1280 px). Poids total des vidéos actuelles : environ 4,6 Mo.
- **Cartes YouTube** (Calail Christ, Boomrang #1, Le Dôgô, Xhalil Xms, Mnsieur Kash) : pas de fichier à fournir. La carte charge une iframe `youtube-nocookie.com` muette, seulement quand elle approche de l'écran, avec la miniature locale en affiche. L'ID est dans l'attribut `data-yt` de la carte (et dans `data-video` pour la fenêtre avec le son).
- Les photos : ajoute-les dans `img/` après les avoir réduites, par exemple dans le Terminal :
  `sips -Z 1600 -s format jpeg -s formatOptions 70 photo.jpg --out img/photo.jpg`

## Bon à savoir

- Le site respecte le réglage « Réduire les animations » du téléphone ou de l'ordinateur : tout s'affiche, rien ne bouge.
- Les animations utilisent GSAP, ScrollTrigger et Lenis, chargés depuis Internet (cdnjs et jsdelivr). Sans connexion à ces services, le site reste complet, simplement sans animations.
- Polices : Archivo, Geist Mono et Instrument Serif, chargées depuis Google Fonts.

## Règle du forfait (13 octobre 2026)
- **150 000 FCFA, tout compris.** Norta Films finance et organise le transport, les repas et l'eau, les lieux et autorisations, et le maquillage. Restent à l'artiste ses tenues, ses accessoires, ses figurants (avec leurs autorisations de droit à l'image) et tout supplément demandé hors du concept, validé par écrit avant.
- Le forfait est ferme : Norta absorbe un dépassement sur ce qu'il finance. Source de vérité : `01-concept/regle-forfait-150k.md`.
- Modifié : hero, section « Le deal » (colonnes « Norta Films apporte » / « De ton côté »), étape 3 et 4, mini-liste et case d'engagement du formulaire, FAQ (inclus, ce qui reste, dépassement, lieux), meta description / Open Graph, message WhatsApp / e-mail (`js/form.js`).

## Mises à jour du 12 octobre 2026 (version en ligne)
- **Prix** : le tarif passe à **150 000 FCFA (150K)** partout (deal, étapes, formulaire, FAQ, message WhatsApp / e-mail). L'image de partage ne contient pas de prix, elle est inchangée.
- **Clips** : uniquement des clips musicaux. Les publicités et les documentaires sont retirés, et 4 clips sont ajoutés (Calail Christ, Xhalil Xms, Le Dôgô, Mnsieur Kash). Les miniatures sont stockées dans `img/`.
- **Bento de boucles muettes** : « Boomrang #2 » retiré de la section clips (il reste dans la comparaison avant/après), One Lyrical en grande carte, lecture automatique muette, survol avec « Voir avec le son ».
- **Bande « Qui tourne »** : compteurs et noms mis en cohérence (7 clips, 7 artistes à l'affiche). Le chiffre « langues de tournage » et le délai de réponse sont inchangés.
- **Section Tanor Fall** (portrait, citation, bio) : supprimée, avec son image et son style. Le crédit « Réal. Tanor Fall » du clap et le lien du pied de page restent.
- **Galerie « Coulisses »** : les photos de pause, de rires, de maquillage et de portrait sont remplacées par des images d'action (rig en gros plan, cadreur sous la lumière, plan bas, stills de clips).
- **Mise en ligne** : GitHub Pages, adresse `https://tanorfall.github.io/run-and-gun/`, fichier `.nojekyll`, adresses absolues pour `og:image` / `twitter:image`.

## Mises à jour du 12 octobre 2026 (version précédente)
- **Clap au chargement** : un clap de cinéma (RUN●GUN, scène 01, prise 01) se ferme puis s'efface en 2 secondes environ, et l'animation du hero démarre juste après. Il ne s'affiche pas si le visiteur a activé « réduire les animations ». Le code est en haut de `index.html` (balisage + petit script) et les styles dans `css/style.css` (section « clap de chargement »).
- **Barre de navigation en bas** : visible uniquement sur mobile et tablette (moins de 900 px). Elle mène à Histoire, Clips, Postuler, Le deal et FAQ, et surligne la section en cours. Sur ordinateur, c'est le menu du haut.
- **Bande défilante sous le hero** : retirée.
- **Galerie « Coulisses »** : les photos surexposées sont remplacées par des recadrages en noir et blanc.

## Fichier audio jusqu'à 10 Mo, même en ligne (mise à jour du 13 octobre 2026)
La fonction en ligne du QG limite une requête à 4,5 Mo. Pour garder les 10 Mo annoncés, `js/form.js` fait ceci quand le fichier dépasse **4 Mo** :
1. il demande une adresse de dépôt signée au QG (`POST …/api/candidature/audio`) ;
2. il envoie le fichier **directement au stockage** (barre de progression) ;
3. il envoie le formulaire **sans le fichier**, avec la clé du fichier (`son_cle`, `son_ticket`, `son_nom`). Le QG relit le fichier et vérifie que c'est bien de l'audio.

En dessous de 4 Mo, rien ne change (le fichier part avec le formulaire). Si le QG répond « dépôt direct indisponible » (501, par exemple avec le QG local), le site retombe sur l'envoi classique.

## 5. Référencement (SEO)

### Ce qui est en place

- `<title>` (56 caractères) et description (140 caractères) avec « clip », « Dakar », « Norta Films », « Run & Gun » ; `lang="fr"`, `canonical` absolu, `hreflang` `fr`, `fr-SN` et `x-default`, `robots` index/follow, `theme-color`.
- Open Graph et cartes Twitter complets (`og:url`, image absolue 1200×630 avec texte alternatif, `og:locale fr_FR`).
- **Données structurées JSON-LD** (un seul bloc `@graph` dans `index.html`, vérifié : JSON valide, types et propriétés présents dans schema.org) : `Organization` Norta Films (avec `sameAs` limité à `https://www.instagram.com/norta_films/`), `WebSite`, `WebPage`, `Service` + `Offer` « Réalisation d'un clip en une journée » (150000 XOF, zone Dakar), `FAQPage` (les 10 questions réelles de la page), 7 `VideoObject` (titre, description, miniature, `embedUrl`).
  - Les `VideoObject` n'ont **pas** de `uploadDate` : on ne connaît pas les dates exactes de mise en ligne. Google n'affichera donc pas de résultat vidéo enrichi tant que la date manque. Pour l'ajouter : dans le bloc JSON-LD, ajouter `"uploadDate": "AAAA-MM-JJ"` à chaque clip.
  - Google n'affiche plus les résultats enrichis FAQ que pour de rares sites officiels : le balisage reste valide et utile aux autres moteurs et aux assistants.
- `sitemap.xml`, `robots.txt`, `404.html` (noindex, lien de retour), `manifest.webmanifest`.
- Un seul `<h1>` (texte lisible par les moteurs : « Run & Gun, saison 01 : un clip musical tourné en une journée à Dakar, par Norta Films », le logo animé reste visuel), h2 par section, h3 pour les sous-parties, textes alternatifs descriptifs en français sur les images utiles, `loading="lazy"` et `width/height` sur toutes les images hors hero, liens externes en `rel="noopener"`.
- Performance : images converties en WebP (400 Ko de photos en moins par page vue, versions 800 px pour mobile via `srcset`), image du hero préchargée, police principale préchargée, feuille de polices non bloquante.
- Place réservée à la validation des moteurs : balises `google-site-verification` et `msvalidate.01` en commentaire dans le `<head>` de `index.html`, avec `CODE_A_REMPLIR`.

### Mesure Lighthouse (mobile, v12)

| | Performance | Accessibilité | Bonnes pratiques | SEO |
|---|---|---|---|---|
| Avant (URL publique, 13/10/2026) | 70 | 93 | 100 | 100 |
| Après (serveur local, 13/10/2026) | 84 | 97 | 100 | 100 |
| Après (URL publique) | PUBLIC_PERF | PUBLIC_A11Y | PUBLIC_BP | PUBLIC_SEO |

Ce qui reste volontairement : le clap d'ouverture (3,2 s) retarde le « plus grand affichage » (LCP) ; les mots de l'histoire qui s'éclaircissent au défilement sont signalés « contraste » par Lighthouse dans leur état de départ ; GitHub Pages impose 10 minutes de cache et sa propre compression. Le score local n'applique ni cache ni compression : la mesure publique fait foi.

Relancer la mesure : `cd 05-sources/tools && npx --yes lighthouse@12 https://tanorfall.github.io/run-and-gun/ --chrome-path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --only-categories=seo,performance,accessibility,best-practices --form-factor=mobile --output=html --output-path=rapport.html --chrome-flags="--headless=new"`

### Limite à connaître : `robots.txt` sur GitHub Pages

Le site est sous `https://tanorfall.github.io/run-and-gun/`. Les moteurs ne lisent `robots.txt` qu'à la **racine du domaine** (`tanorfall.github.io/robots.txt`), pas dans un sous-dossier. Le fichier est donc sans effet tant que le site n'est pas sur un domaine à lui. Ce n'est pas bloquant : tout est indexable par défaut, et **le sitemap se déclare directement dans Google Search Console et Bing Webmaster Tools** (voir ci-dessous). Avec un nom de domaine propre un jour (par exemple `rungun.sn`), `robots.txt` et `sitemap.xml` fonctionneront tels quels ; il faudra alors changer les adresses dans `index.html`, `sitemap.xml`, `robots.txt` et `404.html`.

### Ajouter le site à Google Search Console

1. Va sur https://search.google.com/search-console avec le compte Google de la campagne.
2. « Ajouter une propriété » > **Préfixe d'URL** > `https://tanorfall.github.io/run-and-gun/`.
3. Choisis la validation par **balise HTML** : Google te donne une ligne `<meta name="google-site-verification" content="XXXX">`.
4. Dans `index.html`, dans le bloc commenté près du début du `<head>`, remplace `CODE_A_REMPLIR` de la ligne `google-site-verification` par le code, et enlève les marques de commentaire `<!--` et `-->` autour de **cette ligne seulement** (garde la balise `msvalidate.01` commentée tant que tu n'as pas son code). Publie (`git add -A`, `git commit`, `git push`), attends 1 minute, puis clique sur « Valider » dans Search Console.
5. Menu « Sitemaps » : saisis `sitemap.xml` et envoie. Menu « Inspection de l'URL » : colle l'adresse du site, puis « Demander une indexation ».

### Bing Webmaster Tools

1. https://www.bing.com/webmasters : connecte-toi, « Ajouter un site » et colle l'adresse du site (ou importe depuis Google Search Console, plus rapide).
2. Si tu choisis la balise : remplace `CODE_A_REMPLIR` sur la ligne `msvalidate.01` et dé-commente-la comme ci-dessus.
3. Menu « Sitemaps » : envoie `https://tanorfall.github.io/run-and-gun/sitemap.xml`.

### 10 actions hors site à faire

1. Mettre l'adresse du site dans la **bio et le champ « site web »** de chaque page sociale (Instagram, TikTok, YouTube, Facebook, X, LinkedIn, chaîne WhatsApp) : voir `04-visuels/pages-run-and-gun/CREER-LES-PAGES.md`.
2. Mettre le site dans la **description de chaque clip YouTube** (première ligne) et dans l'onglet « À propos » de la chaîne.
3. Ajouter le lien sur le **portfolio de Tanor Fall** (https://tanorfall-site.vercel.app/) et sur Behance si un profil existe.
4. Créer une fiche **Google Business Profile** (Google Maps) pour Norta Films seulement s'il y a une adresse ou une zone de service à afficher : c'est le meilleur levier pour « clip Dakar » ; la validation demande un courrier ou un appel, prévoir quelques jours.
5. Faire relayer le lien par les **artistes** déjà tournés (Mika Tawou, Keulthieu, Calail Christ, etc.) dans leur bio ou leurs descriptions YouTube : un lien venant d'un autre site compte plus qu'un lien de soi-même.
6. Demander aux **médias et blogs musique** du Sénégal (rap, culture urbaine) un article ou une mention de l'appel à candidatures, avec le lien.
7. Publier le lien dans les **groupes et communautés** d'artistes (Facebook, WhatsApp, Discord) quand les règles le permettent, jamais en spam.
8. Utiliser le **même nom** partout : « Run & Gun · Norta Films » (nom affiché), et toujours le même lien : cohérence = confiance pour les moteurs.
9. Après la sortie des clips de la saison, publier les **clips sur YouTube** avec titre, description et sous-titres en français, et ajouter les vidéos à la page (balisage `VideoObject` avec `uploadDate`).
10. Relancer la mesure Lighthouse et regarder le rapport « Performances » de Search Console toutes les 2 semaines ; corriger ce qui est signalé.

### Ajouter plus tard les autres profils au balisage (`sameAs`)

Quand une page est créée et vérifiée, ajoute son adresse **dans le JSON-LD** (la liste `sameAs` de `Organization`) avec cette commande, depuis `06-site-web` (remplace l'adresse) :

```
python3 - <<'PY'
import re, json
p = "index.html"
s = open(p, encoding="utf-8").read()
m = re.search(r'(<script type="application/ld\+json">\n)(.*?)(\n</script>)', s, re.S)
g = json.loads(m.group(2))
org = next(n for n in g["@graph"] if n["@type"] == "Organization")
nouvelle = "https://www.instagram.com/COMPTE_REEL/"   # <- l'adresse confirmée de la page
if nouvelle not in org["sameAs"]:
    org["sameAs"].append(nouvelle)
s = s[:m.start(2)] + json.dumps(g, ensure_ascii=False, indent=1) + s[m.end(2):]
open(p, "w", encoding="utf-8").write(s)
PY
```

Ne mets que des adresses **confirmées** (page créée et en ligne). Les identifiants proposés sont à vérifier dans `04-visuels/pages-run-and-gun/DESCRIPTIONS-DES-PAGES.md`.
