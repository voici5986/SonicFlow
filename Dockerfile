ARG NODE_VERSION=26
FROM node:${NODE_VERSION}-slim AS base

ENV NPM_HOME="/npm"
ENV PATH="$NPM_HOME:$PATH"
# 新变量优先；旧变量保留在兼容窗口内，便于现有部署平滑切换。
ENV VITE_API_BASE="/api-v1/api.php"
ENV REACT_APP_API_BASE="/api-v1/api.php"
RUN npm install --global pnpm@11
COPY . /app
WORKDIR /app

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/npm/store pnpm install --frozen-lockfile
RUN pnpm run build

# Production stage
FROM nginx:alpine-slim AS production-stage
COPY ./conf/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
