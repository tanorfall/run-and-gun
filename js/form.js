/* RUN & GUN · formulaire de candidature
   1. On valide côté navigateur (champs, fichier audio de 10 Mo max ou lien).
   2. On envoie la candidature (multipart/form-data, avec le fichier) à l'app de pilotage
      de Norta (FORM_ENDPOINT, js/config.js), avec une barre de progression.
   3. Si l'app ne répond pas (ou si FORM_ENDPOINT est vide), on propose WhatsApp / e-mail /
      copier le message. Le fichier audio, lui, doit alors être envoyé en DM. */
(function () {
  'use strict';

  var form = document.getElementById('form');
  if (!form) return;

  var cfg = {
    wa: typeof NORTA_WHATSAPP === 'string' ? NORTA_WHATSAPP.replace(/\D/g, '') : '',
    email: typeof NORTA_EMAIL === 'string' ? NORTA_EMAIL.trim() : '',
    endpoint: typeof FORM_ENDPOINT === 'string' ? FORM_ENDPOINT.trim() : '',
    ig: typeof NORTA_INSTAGRAM === 'string' && NORTA_INSTAGRAM ? NORTA_INSTAGRAM.replace(/^@/, '') : 'norta_films'
  };
  var waOk = /^\d{8,15}$/.test(cfg.wa);
  var mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.email) && !/exemple\.com$/i.test(cfg.email);

  // Une adresse « localhost » ne sert qu'à l'aperçu local : une fois le site en ligne,
  // le navigateur du visiteur ne doit pas essayer de la joindre.
  var isLocal = function (h) { return /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost|.+\.test)$/i.test(h || ''); };
  var endpoint = '';
  if (cfg.endpoint) {
    try {
      var eu = new URL(cfg.endpoint, location.href);
      var pageLocal = location.protocol === 'file:' || isLocal(location.hostname);
      if (isLocal(eu.hostname) && !pageLocal) {
        if (window.console) console.warn('FORM_ENDPOINT pointe vers ' + eu.hostname + ' : à remplacer par l’adresse publique de l’app (js/config.js).');
      } else endpoint = eu.href;
    } catch (e) { /* adresse invalide : pas d'envoi en ligne */ }
  }

  var sent = document.getElementById('sent');
  var done = document.getElementById('done');
  var summary = document.getElementById('error-summary');
  var pres = document.getElementById('f-pres');
  var countOut = form.querySelector('[data-count-out]');
  var countBox = document.getElementById('f-pres-count');
  var submitBtn = form.querySelector('[type="submit"]');
  var submitLabel = submitBtn.innerHTML;
  var MAX = 500;

  // ---------- compteur de caractères ----------
  function updateCount() {
    var n = pres.value.length;
    countOut.textContent = n;
    countBox.classList.toggle('is-near', n >= MAX - 50);
  }
  pres.addEventListener('input', updateCount);
  updateCount();

  // ---------- fichier audio ----------
  var MAX_FILE = 10 * 1024 * 1024; // 10 Mo
  var EXTS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'];
  var OTHER_TYPES = ['', 'application/ogg', 'application/octet-stream', 'video/mp4']; // types parfois annoncés pour de l'audio
  var fileInput = document.getElementById('f-fichier');
  var drop = document.getElementById('f-drop');
  var dropEmpty = drop.querySelector('[data-drop-empty]');
  var dropFile = drop.querySelector('[data-drop-file]');
  var fileName = document.getElementById('f-file-name');
  var fileSize = document.getElementById('f-file-size');
  var audio = document.getElementById('f-file-audio');
  var chosenFile = null, objectUrl = null, fileError = '', pickToken = 0;

  function fmtSize(b, up) {
    if (b < 1024 * 1024) return Math.max(1, Math.round(b / 1024)) + ' Ko';
    var mo = b / 1048576;
    mo = up ? Math.ceil(mo * 10) / 10 : Math.round(mo * 10) / 10;
    return String(mo).replace('.', ',') + ' Mo';
  }
  function extOf(name) { var i = name.lastIndexOf('.'); return i > 0 ? name.slice(i + 1).toLowerCase() : ''; }
  function typeOk(t) { t = (t || '').toLowerCase(); return t.indexOf('audio/') === 0 || OTHER_TYPES.indexOf(t) >= 0; }

  // Lit les premiers octets pour reconnaître un vrai fichier audio (le serveur revérifie).
  function sniff(file) {
    return new Promise(function (resolve) {
      var r = new FileReader();
      r.onload = function () {
        var b = new Uint8Array(r.result), s = '';
        for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
        if (s.slice(0, 3) === 'ID3') return resolve('mp3');
        if (b[0] === 0xFF && (b[1] & 0xE0) === 0xE0) return resolve('mpeg'); // trame MP3 ou AAC (ADTS)
        if (s.slice(0, 4) === 'RIFF' && s.slice(8, 12) === 'WAVE') return resolve('wav');
        if (s.slice(4, 8) === 'ftyp') return resolve('m4a');
        if (s.slice(0, 4) === 'OggS') return resolve('ogg');
        if (s.slice(0, 4) === 'fLaC') return resolve('flac');
        if (s.slice(0, 4) === 'ADIF') return resolve('aac');
        resolve(null);
      };
      r.onerror = function () { resolve('?'); }; // lecture impossible : on laisse le serveur trancher
      r.readAsArrayBuffer(file.slice(0, 12));
    });
  }

  function showFile(file) {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = file ? URL.createObjectURL(file) : null;
    if (file) {
      audio.src = objectUrl;
      fileName.textContent = file.name;
      fileName.title = file.name;
      fileSize.textContent = fmtSize(file.size);
    } else {
      audio.pause(); audio.removeAttribute('src'); audio.load();
      fileName.textContent = ''; fileSize.textContent = '';
    }
    dropFile.hidden = !file;
    dropEmpty.hidden = !!file;
    drop.classList.toggle('has-file', !!file);
  }

  function clearFile() {
    pickToken++;
    chosenFile = null;
    fileInput.value = '';
    showFile(null);
  }

  function rejectFile(msg) {
    clearFile();
    fileError = msg;
    setError(morceauRule, msg);
  }

  function pickFile(file) {
    if (!file) return;
    var token = ++pickToken;
    var ext = extOf(file.name);
    if (EXTS.indexOf(ext) < 0 || !typeOk(file.type)) {
      return rejectFile('Ce format n’est pas accepté' + (ext ? ' (.' + ext + ')' : '') + '. Envoie un fichier MP3, WAV, M4A, AAC, OGG ou FLAC, ou plutôt un lien.');
    }
    if (file.size > MAX_FILE) {
      return rejectFile('Ton fichier fait ' + fmtSize(file.size, true) + '. La limite est de 10 Mo : exporte-le en MP3 320 kbps, ou envoie plutôt un lien.');
    }
    if (!file.size) return rejectFile('Ce fichier est vide. Choisis un autre fichier, ou envoie plutôt un lien.');
    sniff(file).then(function (kind) {
      if (token !== pickToken) return; // un autre fichier a été choisi entre-temps
      if (!kind) return rejectFile('Ce fichier ne ressemble pas à un vrai fichier audio. Exporte ton morceau en MP3 ou en WAV, ou envoie plutôt un lien.');
      chosenFile = file;
      fileError = '';
      showFile(file);
      setError(morceauRule, '');
    });
  }

  fileInput.addEventListener('change', function () { pickFile(fileInput.files && fileInput.files[0]); });
  document.getElementById('f-file-remove').addEventListener('click', function () {
    clearFile();
    fileError = '';
    fileInput.focus();
  });

  // glisser-déposer
  var depth = 0;
  var hasFiles = function (e) { var t = e.dataTransfer && e.dataTransfer.types; return !!t && Array.prototype.indexOf.call(t, 'Files') >= 0; };
  drop.addEventListener('dragenter', function (e) { if (!hasFiles(e)) return; e.preventDefault(); depth++; drop.classList.add('is-over'); });
  drop.addEventListener('dragover', function (e) { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  drop.addEventListener('dragleave', function () { depth = Math.max(0, depth - 1); if (!depth) drop.classList.remove('is-over'); });
  drop.addEventListener('drop', function (e) {
    e.preventDefault(); depth = 0; drop.classList.remove('is-over');
    var f = e.dataTransfer && e.dataTransfer.files;
    if (f && f.length) pickFile(f[0]);
  });
  // un fichier lâché à côté de la zone ne doit pas ouvrir le fichier dans l'onglet
  ['dragover', 'drop'].forEach(function (t) {
    form.addEventListener(t, function (e) { if (hasFiles(e) && !drop.contains(e.target)) e.preventDefault(); });
  });

  // ---------- règles ----------
  var isUrl = function (v) {
    try { var u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch (e) { return false; }
  };
  var val = function (id) { return document.getElementById(id).value.trim(); };

  var morceauRule = { id: 'f-morceau', label: 'Ton morceau', manual: true, focus: 'f-fichier', fields: ['f-fichier'], test: function () {
    if (chosenFile || val('f-son')) return true;
    return fileError || 'Ajoute ton morceau : choisis un fichier audio ou colle un lien.';
  } };

  var rules = [
    { id: 'f-artiste', label: "Nom d'artiste", test: function (v) { return v.length >= 2 || "Indique ton nom d'artiste."; } },
    { id: 'f-nom', label: 'Nom complet', test: function (v) { return v.length >= 3 || 'Indique ton prénom et ton nom.'; } },
    { id: 'f-ville', label: 'Ville', test: function (v) { return v.length >= 2 || 'Indique ta ville.'; } },
    { id: 'f-genre', label: 'Genre musical', test: function (v) { return !!v || 'Choisis un genre musical.'; } },
    { id: 'f-wa', label: 'WhatsApp', test: function (v) {
      if (!v) return 'Indique ton numéro WhatsApp.';
      var d = v.replace(/\D/g, '');
      return (/^[+\d\s().-]+$/.test(v) && d.length >= 9 && d.length <= 15) || 'Ce numéro ne semble pas valide. Exemple : +221 77 000 00 00.';
    } },
    { id: 'f-mail', label: 'E-mail', test: function (v) {
      if (!v) return 'Indique ton adresse e-mail.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Cette adresse e-mail ne semble pas valide.';
    } },
    morceauRule,
    { id: 'f-son', label: 'Lien du son', test: function (v) { return !v || isUrl(v) || 'Colle un lien complet, qui commence par https://'; } },
    { id: 'f-pres', label: 'Présentation', test: function (v) {
      if (v.length < 20) return 'Présente-toi en quelques phrases (20 caractères minimum).';
      return v.length <= MAX || 'Ta présentation dépasse 500 caractères.';
    } },
    { id: 'f-video', label: 'Vidéo « pourquoi toi »', test: function (v) { return !v || isUrl(v) || 'Colle un lien complet, qui commence par https://'; } },
    { id: 'f-reseaux', label: 'Réseaux', focus: 'f-ig', fields: ['f-ig', 'f-tt', 'f-yt', 'f-autre'], test: function () {
      return ['f-ig', 'f-tt', 'f-yt', 'f-autre'].some(function (id) { return val(id); }) || 'Ajoute au moins un réseau (Instagram, TikTok, YouTube ou autre).';
    } },
    { id: 'f-pay', label: 'Engagement de paiement', check: true, test: function () { return document.getElementById('f-pay').checked || 'Coche cette case pour confirmer ton engagement de paiement.'; } },
    { id: 'f-ok', label: 'Accord de contact', check: true, test: function () { return document.getElementById('f-ok').checked || 'Coche cette case pour qu’on puisse te recontacter.'; } }
  ];
  var ruleById = {};
  rules.forEach(function (r) { ruleById[r.id] = r; });

  function setError(rule, msg) {
    var err = document.getElementById(rule.id + '-err');
    if (err) err.textContent = msg || '';
    var targets = rule.fields || [rule.id];
    targets.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var box = rule.check ? el.closest('.check') : el;
      box.classList.toggle('is-invalid', !!msg);
      if (msg) {
        el.setAttribute('aria-invalid', 'true');
        var d = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
        if (d.indexOf(rule.id + '-err') < 0) d.push(rule.id + '-err');
        el.setAttribute('aria-describedby', d.join(' '));
      } else {
        el.removeAttribute('aria-invalid');
      }
    });
  }

  function check(rule) {
    var r = rule.test(rule.fields || rule.check ? '' : val(rule.id));
    var msg = r === true ? '' : r;
    setError(rule, msg);
    return msg;
  }

  // validation au fil de l'eau, une fois qu'un champ a été quitté
  rules.forEach(function (rule) {
    if (rule.manual) return;
    (rule.fields || [rule.id]).forEach(function (id) {
      var el = document.getElementById(id);
      var touched = false;
      el.addEventListener('blur', function () { if (!rule.check) { touched = true; check(rule); } });
      el.addEventListener(rule.check || el.tagName === 'SELECT' ? 'change' : 'input', function () {
        if (touched || el.getAttribute('aria-invalid') === 'true' || rule.fields) check(rule);
      });
    });
  });
  // un lien collé suffit : on retire l'erreur « ton morceau » dès qu'il y en a un
  document.getElementById('f-son').addEventListener('input', function () {
    if (fileInput.getAttribute('aria-invalid') === 'true' && val('f-son')) { fileError = ''; check(morceauRule); }
  });

  // ---------- récapitulatif des erreurs ----------
  function goTo(id) {
    var t = document.getElementById(id);
    if (!t) return;
    t.focus({ preventScroll: true });
    (t.closest('.drop') || t).scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // items : [{ label, msg, focus }]
  function showSummary(intro, items) {
    summary.innerHTML = '';
    var p = document.createElement('p');
    p.textContent = intro;
    summary.appendChild(p);
    if (items && items.length) {
      var ul = document.createElement('ul');
      items.forEach(function (it) {
        var li = document.createElement('li');
        var text = (it.label ? it.label + ' : ' : '') + it.msg;
        if (it.focus) {
          var a = document.createElement('a');
          a.href = '#' + it.focus;
          a.textContent = text;
          a.addEventListener('click', function (ev) { ev.preventDefault(); goTo(it.focus); });
          li.appendChild(a);
        } else li.textContent = text;
        ul.appendChild(li);
      });
      summary.appendChild(ul);
    }
    summary.hidden = false;
  }

  function validate() {
    var errors = [];
    rules.forEach(function (rule) {
      var msg = check(rule);
      if (msg) errors.push({ label: rule.label, msg: msg, focus: rule.focus || rule.id });
    });
    if (errors.length) {
      showSummary(errors.length === 1 ? 'Il reste 1 point à corriger :' : 'Il reste ' + errors.length + ' points à corriger :', errors);
      goTo(errors[0].focus);
    } else {
      summary.hidden = true;
    }
    return errors.length === 0;
  }

  // ---------- données et message ----------
  function data() {
    return {
      nom_artiste: val('f-artiste'),
      nom: val('f-nom'),
      ville: val('f-ville'),
      whatsapp: val('f-wa'),
      email: val('f-mail'),
      genre: val('f-genre'),
      son_url: val('f-son'),
      presentation: val('f-pres'),
      instagram: val('f-ig'),
      tiktok: val('f-tt'),
      youtube: val('f-yt'),
      autre_reseau: val('f-autre'),
      video_url: val('f-video'),
      engagement: document.getElementById('f-pay').checked ? 'oui' : '',
      consentement: document.getElementById('f-ok').checked ? 'oui' : '',
      website: document.getElementById('f-site').value
    };
  }

  function message(d, file) {
    var L = [];
    L.push('CANDIDATURE RUN & GUN · SAISON 01');
    L.push('');
    L.push("Nom d'artiste : " + d.nom_artiste);
    L.push('Nom complet : ' + d.nom);
    L.push('Ville : ' + d.ville);
    L.push('Genre : ' + d.genre);
    L.push('WhatsApp : ' + d.whatsapp);
    L.push('E-mail : ' + d.email);
    L.push('');
    if (d.son_url) L.push('Son : ' + d.son_url);
    if (file) L.push('Fichier audio : ' + file.name + ' (' + fmtSize(file.size) + '), envoyé à part en DM');
    if (d.video_url) L.push('Vidéo « pourquoi moi » : ' + d.video_url);
    L.push('');
    L.push('Réseaux :');
    if (d.instagram) L.push('- Instagram : ' + d.instagram);
    if (d.tiktok) L.push('- TikTok : ' + d.tiktok);
    if (d.youtube) L.push('- YouTube : ' + d.youtube);
    if (d.autre_reseau) L.push('- Autre : ' + d.autre_reseau);
    L.push('');
    L.push('Présentation :');
    L.push(d.presentation);
    L.push('');
    L.push('✔ Je m’engage à régler les 150 000 FCFA (tout compris) en cash sous 72 h si je suis sélectionné.');
    L.push('✔ J’accepte que Norta Films me contacte au sujet de ma candidature.');
    return L.join('\n');
  }

  // fait défiler jusqu'au panneau affiché, sous l'en-tête fixe
  function scrollToPanel(el) {
    var head = document.getElementById('top');
    var off = -((head ? head.offsetHeight : 0) + 16);
    var y = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset + off);
    var lenis = window.__lenis;
    if (lenis) {
      // le formulaire vient d'être masqué : la page a raccourci, on recale Lenis sur la position réelle
      if (lenis.resize) lenis.resize();
      lenis.scrollTo(window.pageYOffset, { immediate: true, force: true });
      lenis.scrollTo(y, { force: true });
    } else window.scrollTo({ top: y, behavior: 'smooth' });
  }

  // ---------- repli : WhatsApp / e-mail / copier ----------
  // reason : pourquoi l'envoi en ligne n'a pas eu lieu ('' si aucun serveur n'est configuré)
  function showSent(d, msg, reason) {
    var wa = document.getElementById('send-wa');
    var mail = document.getElementById('send-mail');
    var warn = document.getElementById('sent-warn');
    var fileNote = document.getElementById('sent-file');
    var txt = sent.querySelector('[data-sent-text]');
    document.getElementById('sent-msg').textContent = msg;

    txt.textContent = reason
      ? reason + ' Pas de panique : ta candidature est prête, envoie-la à Norta Films par l’un de ces moyens.'
      : 'Ta candidature est prête. Choisis comment l’envoyer à Norta Films.';

    fileNote.innerHTML = '';
    if (chosenFile) {
      var s = document.createElement('strong');
      s.textContent = 'Ton fichier audio ne peut pas passer par WhatsApp ni par l’e-mail depuis ce site.';
      fileNote.appendChild(s);
      fileNote.appendChild(document.createTextNode(' Après avoir envoyé le message, envoie « ' + chosenFile.name + ' » en DM à @' + cfg.ig + ' sur Instagram (ou ajoute un lien vers ton son).'));
    }
    fileNote.hidden = !chosenFile;

    var notes = [];
    if (waOk) {
      wa.href = 'https://wa.me/' + cfg.wa + '?text=' + encodeURIComponent(msg);
      wa.hidden = false;
    } else {
      wa.hidden = true;
      notes.push('Le numéro WhatsApp de Norta n’est pas encore configuré.');
    }
    if (mailOk) {
      mail.href = 'mailto:' + cfg.email + '?subject=' + encodeURIComponent('Candidature Run & Gun · ' + d.nom_artiste) + '&body=' + encodeURIComponent(msg);
      mail.hidden = false;
    } else {
      mail.hidden = true;
      notes.push('L’adresse e-mail de Norta n’est pas encore configurée.');
    }
    if (!waOk && !mailOk) notes.push('Copie le message et envoie-le en DM à @' + cfg.ig + ' sur Instagram.');
    warn.textContent = notes.join(' ');
    warn.hidden = !notes.length;
    document.getElementById('sent-retry').hidden = !endpoint;

    form.hidden = true;
    done.hidden = true;
    sent.hidden = false;
    sent.focus({ preventScroll: true });
    scrollToPanel(sent);
  }

  function showDone(d, id) {
    document.getElementById('done-text').textContent = 'Merci ' + d.nom_artiste + '. Norta Films a bien reçu ta candidature' + (chosenFile ? ' et ton morceau' : '') + '. On écoute tout, et on te recontacte sur WhatsApp ou par e-mail.';
    document.getElementById('done-id').textContent = id || '';
    document.getElementById('done-id-box').hidden = !id;
    form.hidden = true;
    sent.hidden = true;
    done.hidden = false;
    done.focus({ preventScroll: true });
    scrollToPanel(done);
  }

  document.getElementById('send-copy').addEventListener('click', function () {
    var btn = this, msg = document.getElementById('sent-msg').textContent;
    var ok = function () { btn.textContent = 'Message copié ✓'; setTimeout(function () { btn.textContent = 'Copier le message'; }, 2200); };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(msg).then(ok, function () { fallbackCopy(msg); ok(); });
    } else { fallbackCopy(msg); ok(); }
  });
  function fallbackCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function backToForm() {
    sent.hidden = true; form.hidden = false;
  }
  document.getElementById('sent-back').addEventListener('click', function () {
    backToForm();
    document.getElementById('f-artiste').focus();
  });
  document.getElementById('sent-retry').addEventListener('click', function () {
    backToForm();
    submit();
  });

  // ---------- progression ----------
  var up = document.getElementById('upload');
  var upBar = document.getElementById('upload-bar');
  var upPct = document.getElementById('upload-pct');
  var upLabel = document.getElementById('upload-label');

  function setProgress(p) {
    p = Math.max(0, Math.min(100, Math.round(p)));
    upBar.style.setProperty('--p', p / 100);
    upBar.setAttribute('aria-valuenow', p);
    upPct.textContent = p + ' %';
    submitBtn.textContent = 'Envoi en cours… ' + p + ' %';
  }
  function setBusy(on) {
    sending = on;
    submitBtn.disabled = on;
    form.setAttribute('aria-busy', on ? 'true' : 'false');
    up.hidden = !on;
    up.classList.remove('is-waiting');
    upLabel.textContent = chosenFile ? 'Envoi de ta candidature et de ton morceau' : 'Envoi de ta candidature';
    if (on) setProgress(0); else submitBtn.innerHTML = submitLabel;
  }

  // ---------- réponse du serveur ----------
  // noms de champs du serveur -> règles du formulaire
  var SERVER_FIELDS = {
    nom_artiste: 'f-artiste', nom: 'f-nom', ville: 'f-ville', whatsapp: 'f-wa', email: 'f-mail', genre: 'f-genre',
    son_fichier: 'f-morceau', son: 'f-morceau', son_url: 'f-son', presentation: 'f-pres', video_url: 'f-video',
    instagram: 'f-reseaux', tiktok: 'f-reseaux', youtube: 'f-reseaux', autre_reseau: 'f-reseaux', reseaux: 'f-reseaux',
    engagement: 'f-pay', consentement: 'f-ok'
  };

  function showServerErrors(erreurs) {
    var items = [], seen = {};
    Object.keys(erreurs).forEach(function (key) {
      var msg = String(erreurs[key] || 'Valeur refusée.');
      var rule = ruleById[SERVER_FIELDS[key]];
      if (rule) {
        if (!seen[rule.id]) { setError(rule, msg); seen[rule.id] = true; }
        items.push({ label: rule.label, msg: msg, focus: rule.focus || rule.id });
      } else {
        items.push({ label: key, msg: msg });
      }
    });
    showSummary('Norta Films n’a pas pu enregistrer ta candidature. ' + (items.length === 1 ? 'Corrige ce point :' : 'Corrige ces points :'), items);
    var first = items.filter(function (i) { return i.focus; })[0];
    if (first) goTo(first.focus); else summary.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function handleResponse(status, body, d, msg) {
    if (status >= 200 && status < 300 && !(body && body.ok === false)) {
      showDone(d, body && body.id != null ? String(body.id) : '');
      return;
    }
    if (status === 413) {
      var m = 'Ton fichier est trop lourd pour le serveur. La limite est de 10 Mo : exporte-le en MP3 320 kbps, ou envoie plutôt un lien.';
      setError(morceauRule, m);
      showSummary('Ta candidature n’est pas partie :', [{ label: 'Ton morceau', msg: m, focus: 'f-fichier' }]);
      goTo('f-fichier');
      return;
    }
    if (status === 429) {
      showSummary('Trop d’envois en peu de temps depuis ta connexion. Attends quelques minutes, puis appuie de nouveau sur « Envoyer ma candidature ». Tes réponses sont gardées.');
      summary.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (status >= 400 && status < 500 && status !== 403 && status !== 404) {
      if (body && body.erreurs && typeof body.erreurs === 'object' && Object.keys(body.erreurs).length) { showServerErrors(body.erreurs); return; }
      showSummary('Norta Films n’a pas pu enregistrer ta candidature. Vérifie tes réponses, puis réessaie.');
      summary.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (status === 403 || status === 404) {
      showSent(d, msg, 'L’envoi en ligne est fermé pour le moment.');
      return;
    }
    if (status >= 500) {
      showSent(d, msg, 'Le serveur de Norta Films a rencontré un problème.');
      return;
    }
    showSent(d, msg, 'L’envoi en ligne n’a pas abouti.');
  }

  // ---------- envoi ----------
  var sending = false;
  function submit() {
    if (sending) return;
    if (document.getElementById('f-site').value) return; // robot
    if (!validate()) return;

    var d = data(), msg = message(d, chosenFile);
    if (!endpoint) { showSent(d, msg, ''); return; }

    var fd = new FormData();
    Object.keys(d).forEach(function (k) { fd.append(k, d[k]); });

    summary.hidden = true;
    setBusy(true);

    // Gros fichier : dépôt direct chez le stockage (la fonction en ligne limite une requête à 4,5 Mo).
    // Si le serveur ne propose pas le dépôt direct (501), on retombe sur l'envoi classique avec le formulaire.
    if (chosenFile && chosenFile.size > DIRECT_MIN) {
      directUpload(chosenFile, fd, d, msg);
    } else {
      if (chosenFile) fd.append('son_fichier', chosenFile, chosenFile.name);
      postForm(fd, d, msg);
    }
  }

  // Au-delà de ce poids, le fichier ne passe pas dans la requête du formulaire (limite 4,5 Mo de la fonction en ligne).
  var DIRECT_MIN = 4 * 1024 * 1024;

  function apiBase() { return endpoint.replace(/\/api\/candidature\/?$/, ''); }

  function failNet(d, msg, texte) {
    setBusy(false);
    showSent(d, msg, texte || 'Impossible de joindre le serveur de Norta Films (connexion coupée ou serveur indisponible).');
  }

  function showStep(label, pct) {
    up.classList.remove('is-waiting');
    upLabel.textContent = label;
    setProgress(pct);
  }

  // Envoi du formulaire (avec ou sans fichier) vers l'app.
  function postForm(fd, d, msg) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.setRequestHeader('Accept', 'application/json'); // pas de Content-Type : le navigateur ajoute la frontière multipart
    xhr.timeout = 5 * 60 * 1000;
    xhr.upload.addEventListener('progress', function (e) {
      if (e.lengthComputable) setProgress(e.loaded / e.total * 100);
    });
    xhr.upload.addEventListener('load', function () {
      setProgress(100);
      up.classList.add('is-waiting');
      upLabel.textContent = 'Enregistrement de ta candidature…';
    });
    xhr.addEventListener('load', function () {
      var body = null;
      try { body = JSON.parse(xhr.responseText); } catch (e) {}
      setBusy(false);
      handleResponse(xhr.status, body, d, msg);
    });
    var fail = function () { failNet(d, msg); };
    xhr.addEventListener('error', fail);
    xhr.addEventListener('timeout', fail);
    xhr.addEventListener('abort', fail);
    xhr.send(fd);
  }

  // Dépôt direct : 1) adresse signée, 2) PUT du fichier chez le stockage, 3) formulaire avec la clé du fichier.
  function directUpload(file, fd, d, msg) {
    showStep('Préparation de l’envoi du fichier…', 0);
    var x1 = new XMLHttpRequest();
    x1.open('POST', apiBase() + '/api/candidature/audio', true);
    x1.setRequestHeader('Content-Type', 'application/json');
    x1.setRequestHeader('Accept', 'application/json');
    x1.timeout = 30000;
    x1.addEventListener('load', function () {
      var b = null;
      try { b = JSON.parse(x1.responseText); } catch (e) {}
      if (x1.status === 501) { // dépôt direct indisponible : envoi classique
        fd.append('son_fichier', file, file.name);
        postForm(fd, d, msg);
        return;
      }
      if (x1.status < 200 || x1.status >= 300 || !b || !b.ok || !b.url) {
        setBusy(false);
        handleResponse(x1.status || 500, b, d, msg);
        return;
      }
      // 2) dépôt du fichier chez le stockage
      var body = new FormData();
      body.append('cacheControl', '3600');
      body.append('', file);
      var x2 = new XMLHttpRequest();
      x2.open('PUT', b.url, true);
      x2.timeout = 5 * 60 * 1000;
      showStep('Envoi de ton fichier audio…', 0);
      x2.upload.addEventListener('progress', function (e) {
        if (e.lengthComputable) setProgress(e.loaded / e.total * 100);
      });
      x2.addEventListener('load', function () {
        if (x2.status < 200 || x2.status >= 300) {
          failNet(d, msg, 'Le fichier audio n’a pas pu être envoyé. Envoie plutôt un lien vers ton son, ou réessaie.');
          return;
        }
        // 3) formulaire, sans le fichier, avec la clé et le ticket
        fd.append('son_cle', b.cle);
        fd.append('son_ticket', b.ticket);
        fd.append('son_nom', file.name);
        postForm(fd, d, msg);
      });
      var fail2 = function () { failNet(d, msg, 'Le fichier audio n’a pas pu être envoyé (connexion coupée). Réessaie, ou envoie un lien vers ton son.'); };
      x2.addEventListener('error', fail2);
      x2.addEventListener('timeout', fail2);
      x2.addEventListener('abort', fail2);
      x2.send(body);
    });
    var fail1 = function () { failNet(d, msg); };
    x1.addEventListener('error', fail1);
    x1.addEventListener('timeout', fail1);
    x1.addEventListener('abort', fail1);
    x1.send(JSON.stringify({ nom_fichier: file.name, taille: file.size }));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submit();
  });
})();
