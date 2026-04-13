FROM node:25-slim

WORKDIR /app

ENV NODE_ENV=development
ENV CI=true

CMD ["bash"]