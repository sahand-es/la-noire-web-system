# Build stage
FROM hub.hamdocker.ir/node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npm run build

# Serve stage
FROM hub.hamdocker.ir/nginx:alpine

ENV VITE_API_URL=http://localhost:8000/api/v1

COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["sh", "-c", "API_URL=\"${VITE_API_URL:-http://localhost:8000/api/v1}\"; echo \"window.__RUNTIME_CONFIG__ = {\\\"apiUrl\\\":\\\"\"$API_URL\"\\\"};\" > /usr/share/nginx/html/config.js && exec nginx -g 'daemon off;'"]
