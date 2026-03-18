# BUILD STAGE
FROM node:20-alpine AS build

WORKDIR /app

# Khai báo các biến môi trường cho Vite trong quá trình build
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Cài đặt dependencies
COPY package*.json ./
RUN npm ci

# Copy mã nguồn và build
COPY . .
RUN npm run build

# PRODUCTION STAGE
FROM nginx:stable-alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
