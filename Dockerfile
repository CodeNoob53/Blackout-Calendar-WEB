# Build Stage
FROM node:20-alpine as builder
WORKDIR /app

# Copy package files (use yarn.lock since user uses yarn)
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the app
RUN yarn build

# Production Stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Port 8080 is required by Cloud Run
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
