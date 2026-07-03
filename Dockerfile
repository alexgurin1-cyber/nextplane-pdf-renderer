# NextPlane PDF renderer for Railway
FROM ghcr.io/puppeteer/puppeteer:23.11.1

ENV PUPPETEER_SKIP_CHROME_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./

EXPOSE 8080
CMD ["node", "server.js"]
