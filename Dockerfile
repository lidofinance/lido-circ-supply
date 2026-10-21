FROM node:22-alpine AS building

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --non-interactive && yarn cache clean

COPY ./tsconfig*.json ./
COPY ./src ./src

RUN yarn build

FROM node:22-alpine AS production-deps

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --production --frozen-lockfile --non-interactive && yarn cache clean

FROM node:22-alpine

WORKDIR /app

# Drop npm/yarn from the runtime image: the container only runs `node dist/main`
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=building /app/dist ./dist
COPY ./package.json ./build-info.json ./

# Set by lidofinance/actions k8s-build-push-harbor. Old-infra and local builds leave
# them empty, so build-info.json stays as copied (infra-mainnet fills it beforehand).
ARG BUILD_VERSION=
ARG BUILD_BRANCH=
ARG BUILD_COMMIT=

RUN if [ -n "$BUILD_VERSION" ]; then sed -i "s|REPLACE_WITH_VERSION|$BUILD_VERSION|" build-info.json; fi \
  && if [ -n "$BUILD_BRANCH" ]; then sed -i "s|REPLACE_WITH_BRANCH|$BUILD_BRANCH|" build-info.json; fi \
  && if [ -n "$BUILD_COMMIT" ]; then sed -i "s|REPLACE_WITH_COMMIT|$BUILD_COMMIT|" build-info.json; fi

USER node

HEALTHCHECK --interval=60s --timeout=10s --retries=3 \
  CMD sh -c "wget -nv -t1 --spider http://localhost:${PORT:-3000}/health" || exit 1

CMD ["node", "dist/main"]
