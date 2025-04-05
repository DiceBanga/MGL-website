#!/bin/bash

# n8n Setup Script for MGL Website Backend
# This script helps set up the n8n environment for development

# Create required directories
echo "Creating directory structure..."
mkdir -p workflows
mkdir -p workflows/cores
mkdir -p workflows/team
mkdir -p workflows/payment
mkdir -p workflows/registration
mkdir -p workflows/notifications
mkdir -p credentials

# Create the .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "Creating .env file from example..."
  cp .env.example .env
  
  # Generate a random encryption key
  ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))" 2>/dev/null)
  if [ -z "$ENCRYPTION_KEY" ]; then
    # Fallback to OpenSSL if Node.js is not available
    ENCRYPTION_KEY=$(openssl rand -hex 24)
  fi
  
  # Update the encryption key in the .env file
  if [ ! -z "$ENCRYPTION_KEY" ]; then
    sed -i "s/replace-with-32-character-random-string/$ENCRYPTION_KEY/g" .env
    echo "Generated random encryption key."
  else
    echo "Warning: Could not generate encryption key. Please set N8N_ENCRYPTION_KEY manually in .env"
  fi
  
  echo ".env file created. Please edit it to add your credentials."
else
  echo ".env file already exists. Skipping."
fi

# Create the docker-compose override file if it doesn't exist
if [ ! -f docker-compose.override.yml ]; then
  echo "Creating docker-compose.override.yml for local development..."
  cat > docker-compose.override.yml << EOF
version: '3.8'

services:
  n8n:
    environment:
      - N8N_EDITOR_BASE_URL=http://localhost:5678
      - NODE_ENV=development
      - EXECUTIONS_MODE=queue
    volumes:
      - ./credentials:/home/node/.n8n/credentials
      - ./workflows:/home/node/.n8n/workflows
EOF
  echo "Created docker-compose.override.yml"
else
  echo "docker-compose.override.yml already exists. Skipping."
fi

# Create a README.md file with quick start instructions
if [ ! -f README.local.md ]; then
  echo "Creating quick start instructions..."
  cat > README.local.md << EOF
# n8n Local Development

## Quick Start

1. Edit the .env file with your credentials
2. Start the containers:
   \`\`\`
   docker-compose up -d
   \`\`\`
3. Access n8n at http://localhost:5678

## Important Notes

- Workflow files are stored in the ./workflows directory
- Credentials are stored in the ./credentials directory
- All changes are saved automatically

## Stopping the Environment

\`\`\`
docker-compose down
\`\`\`

## Resetting the Environment

To completely reset (will delete all data):
\`\`\`
docker-compose down -v
\`\`\`
EOF
  echo "Created README.local.md with quick start instructions."
else
  echo "README.local.md already exists. Skipping."
fi

# Create placeholder workflows
echo "Creating placeholder workflows..."

mkdir -p workflows/cores
cat > workflows/cores/request-processor.json << EOF
{
  "name": "Request Processor",
  "nodes": [],
  "connections": {},
  "active": false,
  "settings": {},
  "id": "request-processor"
}
EOF

mkdir -p workflows/payment
cat > workflows/payment/payment-processor.json << EOF
{
  "name": "Payment Processor",
  "nodes": [],
  "connections": {},
  "active": false,
  "settings": {},
  "id": "payment-processor"
}
EOF

mkdir -p workflows/team
cat > workflows/team/team-transfer.json << EOF
{
  "name": "Team Transfer",
  "nodes": [],
  "connections": {},
  "active": false,
  "settings": {},
  "id": "team-transfer"
}
EOF

echo "Environment setup complete!"
echo "Next steps:"
echo "1. Edit the .env file with your credentials"
echo "2. Run 'docker-compose up -d' to start the environment"
echo "3. Access n8n at http://localhost:5678" 