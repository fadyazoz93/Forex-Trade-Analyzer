FROM node:22-alpine

WORKDIR /app

# Copy package specifications
COPY package*.json ./

# Install dependencies
RUN npm ci || npm install

# Copy source files
COPY . .

# Build frontend and server
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
