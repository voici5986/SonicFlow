ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-slim AS build

WORKDIR /app

ENV VITE_API_BASE="/api-v1/api.php"
ENV HUSKY=0

RUN npm install --global pnpm@11 \
    && pnpm config set store-dir /pnpm/store

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build


FROM nginx:stable-alpine-slim AS production

COPY ./conf/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
