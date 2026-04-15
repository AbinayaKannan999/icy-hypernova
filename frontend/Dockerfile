# Stage 1: Build the React App
FROM node:18-alpine as build
WORKDIR /app

# Accept build-time environment variables from docker-compose
ARG REACT_APP_API_URL=/api
ARG REACT_APP_SOCKET_URL=
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL

# Temporarily copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files and build for production
COPY . .
RUN npm run build

# Stage 2: Serve the App using Nginx
FROM nginx:alpine
# Copy the built assets to the default nginx public directory
COPY --from=build /app/build /usr/share/nginx/html
# Override the default Nginx configuration to support client-side React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
