FROM bayesimpact/react-base

RUN mkdir -p /usr/src/app

RUN mkdir -p /usr/src/app/api
WORKDIR /usr/src/app/api
COPY api/package.json /usr/src/app/api
COPY api/yarn.lock /usr/src/app/api
RUN yarn install

RUN mkdir -p /usr/src/app/client
WORKDIR /usr/src/app/client
COPY client/package.json /usr/src/app/client
COPY client/yarn.lock /usr/src/app/api
RUN yarn install

RUN yarn global add react-scripts nodemon
COPY . /usr/src/app/
WORKDIR /usr/src/app

CMD bash start.sh