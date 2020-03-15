FROM node:10.12

WORKDIR /var/opt/app

COPY package.json .
COPY src src/

RUN npm install

CMD npm start
