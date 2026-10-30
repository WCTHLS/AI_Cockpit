FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install && chmod -R +x node_modules/.bin
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

ENV BACKEND_URL=http://localhost:8000

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
