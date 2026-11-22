FROM node:20-bookworm-slim

WORKDIR /app

# Prisma requires OpenSSL-compatible libraries
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy all files
COPY . .

# Install dependencies
RUN npm install

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3001

# Run in development mode with ts-node
CMD ["npx", "ts-node", "-r", "tsconfig-paths/register", "src/main.ts"]
