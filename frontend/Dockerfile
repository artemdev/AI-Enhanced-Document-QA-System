
FROM node:20-alpine
 
WORKDIR /app/frontend
 
COPY package*.json ./
 
RUN npm install
 
COPY . .

EXPOSE 8080

RUN npm run build

CMD ["npm", "start", ":8080"]