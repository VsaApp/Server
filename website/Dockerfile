FROM octoblu/pnpm

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app
RUN pnpm install
RUN npm install nodemon -g
COPY . /usr/src/app

CMD nodemon index.js -q