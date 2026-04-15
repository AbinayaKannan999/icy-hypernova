FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Bundle app source
COPY . .

# Expose port
EXPOSE 5000

# Start command
CMD sh -c "node src/database/migrate.js && node src/database/seed.js && node src/server.js"
