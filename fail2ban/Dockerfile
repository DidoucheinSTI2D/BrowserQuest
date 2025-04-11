FROM debian:stable-slim

# Installer Fail2Ban et d'autres utilitaires nécessaires
RUN apt-get update && apt-get install -y \
    fail2ban \
    iputils-ping \
    whois \
    net-tools \
    iproute2 && \
    apt-get clean

# Copier les fichiers de configuration
COPY jail.local /fail2ban/jail.local
COPY nginx-http-auth.conf /fail2ban/filter.d/nginx-http-auth.conf

# Démarrer Fail2Ban en mode foreground (pour le faire tourner en processus principal)
CMD ["fail2ban-server", "-f"]
