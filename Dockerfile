FROM node:22-alpine AS building

WORKDIR /app

COPY package.json yarn.lock ./
COPY ./tsconfig*.json ./
COPY ./src ./src

RUN yarn install --frozen-lockfile --non-interactive && yarn cache clean
RUN yarn build

FROM node:22-alpine AS production-deps

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --production --frozen-lockfile --non-interactive && yarn cache clean

FROM node:22-alpine

WORKDIR /app

# Patch OS packages and drop npm/yarn from the runtime image: the container
# only runs `node dist/main`
RUN apk upgrade --no-cache \
  && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=building /app/dist ./dist
COPY ./package.json ./

USER node

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
  CMD sh -c "wget -nv -t1 --spider http://localhost:${PORT:-3000}/health" || exit 1

CMD ["sh", "-c", "source /vault/secrets/app && exec node dist/main"]
