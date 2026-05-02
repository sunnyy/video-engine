FROM node:20-bookworm-slim

# Install shared libraries that Remotion's chrome-headless-shell needs,
# plus ffmpeg for video stitching.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build the frontend
COPY . .
RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
