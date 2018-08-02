FROM octoblu/pnpm

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app
RUN pnpm install
COPY . /usr/src/app

CMD [ "node", "index.js" ]