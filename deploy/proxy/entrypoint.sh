#!/bin/sh
set -eu

domain="${DOMAIN:-_}"
export DOMAIN="$domain"
cert="/etc/letsencrypt/live/${domain}/fullchain.pem"

rm -f /etc/nginx/conf.d/default.conf
if [ -n "$domain" ] && [ "$domain" != "_" ] && [ -f "$cert" ]; then
  envsubst '${DOMAIN}' < /opt/nginx-templates/https.conf.template > /etc/nginx/conf.d/default.conf
else
  envsubst '${DOMAIN}' < /opt/nginx-templates/http.conf.template > /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
