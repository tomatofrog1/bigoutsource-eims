FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 5001

# Start the application
CMD ["npm", "start"]
