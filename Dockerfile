# NextPlane PDF renderer for Railway
FROM ghcr.io/puppeteer/puppeteer:23.11.1

# Use the Chrome already bundled in this image (skip re-download at npm install)
ENV PUPPETEER_SKIP_CHROME_DOWNLOAD=true

WORKDIR /usr/src/app
COPY --chown=pptruser:pptruser package.json ./
RUN npm install --omit=dev
COPY --chown=pptruser:pptruser server.js ./

EXPOSE 8080
CMD ["node", "server.js"]
