#!/bin/bash

# Créer le dossier de logs s'il n'existe pas
mkdir -p logs

# Démarrer le serveur avec redirection des logs
node server/js/main.js > logs/browserquest.log 2>&1
