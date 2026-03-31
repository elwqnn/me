REGISTRY := "ghcr.io/elwqnn"
IMAGE := REGISTRY + "/me"

default:
    @just --list

# - Dev ---

dev:
    bun dev

# - Build ---

build:
    bun run build

# - Quality ---

typecheck:
    bun run typecheck

ci: typecheck

# - Docker ---

up:
    docker compose up -d

down:
    docker compose down

logs:
    docker compose logs -f

push:
    docker build -t {{ IMAGE }}:latest .
    docker push {{ IMAGE }}:latest

# - Deploy ---

deploy:
    git pull origin main && docker pull {{ IMAGE }}:latest && docker compose up -d
