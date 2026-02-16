# Build stage
FROM node:22-alpine AS builder

WORKDIR /build

COPY web/package.json web/package-lock.json* ./
RUN npm ci

COPY web/ .

RUN mkdir -p src/__generated__
RUN npm run relay
RUN npm run build

# Runtime stage
FROM nginx:alpine

COPY --from=builder /build/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
