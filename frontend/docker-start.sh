#!/bin/sh
# Apply pending database migrations, then start the Next.js server.
set -eu

cd /migrate
node node_modules/prisma/build/index.js migrate deploy
cd /app
exec node server.js
