FROM node:20

RUN apt-get update && apt-get install -y nginx && apt-get clean

WORKDIR /app

COPY . .

RUN npm install

WORKDIR /app

ARG PORT=8000
ENV PORT=${PORT}

RUN cp /app/server/config.json /app/server/config_runtime.json && \
    sed -i "s/\\\$PORT/${PORT}/g" /app/server/config_runtime.json

RUN mv /app/server/config_runtime.json /app/server/config_local.json


COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8000 8080

CMD ["node", "server/js/main.js"]
