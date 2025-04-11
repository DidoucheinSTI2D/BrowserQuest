BrowserQuest 
============

Team Member :
============

Mehdi Benchrif
Grégoire Mercier
Imrane Mesbahi
Mikaël Lahlou

Changes
============
  * Updated backend and frontend to use Socket.IO server and Client
  * Update ws use to be able to start the project in local.
  * Added Docker containers for client and server
  * Implemented load balancing with Nginx for load distribution and scalability

HOW TO RUN? (local)
============

```
npm install
node server/js/main.js
```

Then go inside the Client folder and open index.html.

You might want to host a webserver and open index.html in that (e.g. 127.0.0.1/index.html).


HOW TO RUN? (Docker)
============

```
docker-compose up --build
```

You can also see logs from load balancer (Which server you are on, if both are enable, what is happening in both server, ...) : 

```
docker-compose logs -f browserquest1 browserquest2
```

License
-------

Code is licensed under MPL 2.0. Content is licensed under CC-BY-SA 3.0.
See the LICENSE file for details.


Credits
-------
Created by [Little Workshop](http://www.littleworkshop.fr):

* Franck Lecollinet - [@whatthefranck](http://twitter.com/whatthefranck)
* Guillaume Lecollinet - [@glecollinet](http://twitter.com/glecollinet)
