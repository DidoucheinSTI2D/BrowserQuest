FROM node:20

RUN apt-get update && apt-get install -y nginx && apt-get clean

WORKDIR /app

COPY . .

RUN npm install

WORKDIR /app/client
RUN rm -rf /var/www/html && cp -r /app/client /var/www/html

RUN ln -s /app/shared /var/www/html/shared

COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 8000 8080

CMD bash -c "cd /app && node server/js/main.js & nginx -g 'daemon off;'"
