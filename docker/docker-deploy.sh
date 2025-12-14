#!/bin/bash

# ===========================================
# Docker Deployment Script
# ===========================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Configuration
IMAGE_NAME="app-distribution"
CONTAINER_NAME="app-distribution"
PORT="3009"

show_help() {
    echo "Usage: ./docker-deploy.sh [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build       Build the Docker image"
    echo "  start       Start the container"
    echo "  stop        Stop the container"
    echo "  restart     Restart the container"
    echo "  logs        View container logs"
    echo "  shell       Open shell in container"
    echo "  up          Build and start with docker-compose"
    echo "  down        Stop and remove with docker-compose"
    echo "  up-nginx    Start with nginx reverse proxy"
    echo "  ssl-init    Initialize SSL certificates"
    echo ""
}

build() {
    log "Building Docker image..."
    docker build -t $IMAGE_NAME .
    log "Build complete!"
}

start() {
    log "Starting container..."
    docker run -d \
        --name $CONTAINER_NAME \
        -p $PORT:3009 \
        -v $(pwd)/uploads:/app/uploads \
        --restart unless-stopped \
        $IMAGE_NAME
    log "Container started on port $PORT"
}

stop() {
    log "Stopping container..."
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    log "Container stopped"
}

restart() {
    stop
    start
}

logs() {
    docker logs -f $CONTAINER_NAME
}

shell() {
    docker exec -it $CONTAINER_NAME /bin/sh
}

compose_up() {
    log "Starting with docker-compose..."
    docker-compose up -d --build
    log "Application started!"
    echo ""
    echo "  URL: http://localhost:$PORT"
    echo "  Logs: docker-compose logs -f"
}

compose_down() {
    log "Stopping containers..."
    docker-compose down
    log "Containers stopped"
}

compose_up_nginx() {
    log "Starting with nginx..."
    docker-compose --profile with-nginx up -d --build
    log "Application started with nginx!"
}

ssl_init() {
    DOMAIN="apps.ipification.com"
    EMAIL="admin@ipification.com"
    
    log "Initializing SSL certificates for $DOMAIN..."
    
    # Create directories
    mkdir -p certbot/conf certbot/www
    
    # Download recommended TLS parameters
    if [ ! -e "certbot/conf/options-ssl-nginx.conf" ]; then
        curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > certbot/conf/options-ssl-nginx.conf
        curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > certbot/conf/ssl-dhparams.pem
    fi
    
    # Create dummy certificate for nginx to start
    log "Creating dummy certificate..."
    mkdir -p certbot/conf/live/$DOMAIN
    docker run --rm -v $(pwd)/certbot/conf:/etc/letsencrypt \
        certbot/certbot certonly --standalone \
        -d $DOMAIN \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --staging  # Remove --staging for production
    
    log "SSL initialization complete!"
    warn "Remove --staging flag in ssl_init() for production certificates"
}

# Main
case "${1:-help}" in
    build)      build ;;
    start)      start ;;
    stop)       stop ;;
    restart)    restart ;;
    logs)       logs ;;
    shell)      shell ;;
    up)         compose_up ;;
    down)       compose_down ;;
    up-nginx)   compose_up_nginx ;;
    ssl-init)   ssl_init ;;
    help|*)     show_help ;;
esac
