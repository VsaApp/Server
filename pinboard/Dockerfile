FROM bayesimpact/react-base

RUN mkdir -p /usr/src/app

RUN mkdir -p /usr/src/app/api
WORKDIR /usr/src/app/api
COPY api/package.json /usr/src/app/api
RUN npm install

RUN mkdir -p /usr/src/app/client
WORKDIR /usr/src/app/client
COPY client/package.json /usr/src/app/client
RUN npm install

RUN npm i -g react-scripts nodemon
COPY . /usr/src/app/
WORKDIR /usr/src/app

CMD bash start.sh