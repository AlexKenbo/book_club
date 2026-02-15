FROM node:20-alpine AS build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" > .env && \
    echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> .env && \
    npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
