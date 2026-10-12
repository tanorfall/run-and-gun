/* =========================================================================
   RUN & GUN · Norta Films · RÉGLAGES DU SITE
   C'est le seul fichier à modifier avant la mise en ligne.
   ========================================================================= */

// Numéro WhatsApp de Norta Films, au format international, chiffres seulement.
// Exemple : '221771234567' (221 = Sénégal, puis le numéro sans le 0 ni les espaces).
const NORTA_WHATSAPP = '221XXXXXXXXX';

// Adresse e-mail qui reçoit les candidatures envoyées par e-mail.
const NORTA_EMAIL = 'contact@exemple.com';

// Adresse qui enregistre les candidatures dans l'app de pilotage de l'équipe (09-app-pilotage).
// Le site y envoie chaque candidature (champs + fichier audio de 10 Mo max) en multipart/form-data.
//
// - Aperçu local : l'app tourne sur ton ordinateur, port 3100. Laisse la valeur ci-dessous.
// - EN PRODUCTION : remplace par l'adresse publique de l'app, en https, par exemple
//   'https://<adresse-de-l-app>/api/candidature'
//   (une adresse « localhost » ne marche que sur ton ordinateur : en ligne, le site l'ignore
//   et propose directement WhatsApp / e-mail.)
// - Laisse vide ('') pour ne rien enregistrer : le site propose alors WhatsApp et e-mail.
// Si l'app ne répond pas, le site retombe automatiquement sur WhatsApp / e-mail / copier le message.
const FORM_ENDPOINT = 'http://localhost:3100/api/candidature';

// Compte Instagram affiché sur le site.
const NORTA_INSTAGRAM = 'norta_films';
