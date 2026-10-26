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

# - Deploy ---

deploy:
    git pull --ff-only origin main && docker compose up -d --build app
