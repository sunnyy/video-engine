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

# Build-time vars for Vite. Railway supplies matching service variables to these
# ARGs at build time; promoting them to ENV makes them visible to `vite build`,
# which bakes VITE_* into the client bundle (Supabase client, PostHog, API URL).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
ARG VITE_PUBLIC_POSTHOG_HOST
ARG VITE_APP_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_PUBLIC_POSTHOG_PROJECT_TOKEN=$VITE_PUBLIC_POSTHOG_PROJECT_TOKEN \
    VITE_PUBLIC_POSTHOG_HOST=$VITE_PUBLIC_POSTHOG_HOST \
    VITE_APP_URL=$VITE_APP_URL

# Copy source and build the frontend
COPY . .
RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]
