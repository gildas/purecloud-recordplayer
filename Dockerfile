FROM node:5
MAINTAINER Gildas Cherruel <gildas.cherruel@inin.com>

ENV NODE_ENV=development
WORKDIR /usr/local/src

RUN npm install --global foreman@2.0.0-1
RUN npm install --global browser-sync

COPY package.json /usr/local/src/package.json
COPY bower.json   /usr/local/src/bower.json
RUN npm install

COPY app.js /usr/local/src/app.js
COPY Procfile /usr/local/src/Procfile
COPY config.json /usr/local/src/config.json
COPY public /usr/local/src/public
COPY routes /usr/local/src/routes
COPY views /usr/local/src/views

RUN npm --version
RUN nf --version

EXPOSE 3000
CMD [ "npm", "start" ]
