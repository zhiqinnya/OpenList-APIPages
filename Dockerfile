FROM node:lts
WORKDIR /app
RUN npm install -g wrangler
COPY wrangler.example.jsonc wrangler.jsonc
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
COPY package*.json ./
COPY public ./public
COPY src ./src
RUN npm install
EXPOSE 3000
ENTRYPOINT ["sh","/app/entrypoint.sh"]