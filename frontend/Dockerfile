FROM node:18-alpine

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install all dependencies needed for Next.js and Tailwind
RUN npm ci

# Copy source code
COPY src ./src
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

EXPOSE 3000

CMD ["npm", "run", "dev"]
