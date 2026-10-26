VPS := "root@vps-016c426c"
APP_DIR := "/home/axo/app/me"

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
    git push origin main
    ssh {{ VPS }} "su - axo -c 'cd {{ APP_DIR }} && git pull --ff-only origin main && docker compose up -d --build app'"
