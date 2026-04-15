# Stage 1: Build the React App
FROM node:18-alpine as build
WORKDIR /app

# Temporarily copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files and build for production
COPY . .
# Setting an environment variable here if needed (e.g. backend URL)
# Note: For static bundles, variables are baked in at build time.
# Provide a substitute value or utilize a dynamic runtime injection for external APIs
RUN npm run build

# Stage 2: Serve the App using Nginx
FROM nginx:alpine
# Copy the built assets to the default nginx public directory
COPY --from=build /app/build /usr/share/nginx/html
# Override the default Nginx configuration to support client-side React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
