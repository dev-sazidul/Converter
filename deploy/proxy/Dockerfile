FROM nginx:1.27-alpine

RUN apk add --no-cache wget
COPY entrypoint.sh /entrypoint.sh
COPY http.conf.template /opt/nginx-templates/http.conf.template
COPY https.conf.template /opt/nginx-templates/https.conf.template
RUN chmod 755 /entrypoint.sh

EXPOSE 80 443
ENTRYPOINT ["/entrypoint.sh"]
