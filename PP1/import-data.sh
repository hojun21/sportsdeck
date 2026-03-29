#!/bin/bash

echo "Running migrations..."
docker compose exec app npx prisma migrate deploy

echo "Generating Prisma client..."
docker compose exec app npx prisma generate

echo "Setting up EPL teams..."
docker compose exec app node src/scripts/setup_epl_teams.js

echo "Creating admin..."
docker compose exec app node src/scripts/signup_admin.js

echo "Creating users..."
docker compose exec app node src/scripts/generate_users.js

echo "Creating replies..."
docker compose exec app node src/scripts/seed_reply.js

echo "Creating reports and appeals..."
docker compose exec app node src/scripts/seed_reports_appeal.js

echo "Data import completed!"