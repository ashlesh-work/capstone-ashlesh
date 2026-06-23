# Access508 — portable container.
# Builds the web front end + server, then serves both from the Fastify origin.
# (Single-stage for clarity; see README "Production hardening" for a pruned
#  multi-stage variant.)
FROM node:20-bookworm-slim

WORKDIR /app

# Install workspace dependencies first (better layer caching).
COPY package.json package-lock.json* ./
COPY packages/core/package.json ./packages/core/package.json
COPY server/package.json ./server/package.json
COPY web/package.json ./web/package.json
RUN npm install

# Copy the rest of the source and build.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

# The server serves web/dist when present (see server/src/index.ts).
CMD ["npm", "run", "start", "--workspace", "server"]
