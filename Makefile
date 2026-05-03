# ============================================================
# File Explorer — Makefile
# ============================================================
# Loads .env automatically if it exists.
# Variables can also be overridden on the command line:
#   make migrate DB_HOST=localhost DB_PORT=5432 DB_NAME=mydb
# ============================================================

# Load .env if present (silently skip if missing)
-include .env
export

DB_HOST      ?= localhost
DB_PORT      ?= 5432
DB_NAME      ?= file_explorer
DB_USER      ?= postgres
DB_PASS      ?= postgres
DB_CONTAINER ?= local-postgres

# Runs psql inside the Postgres Docker container — no local psql install needed.
# Override DB_CONTAINER if your container has a different name:
#   make migrate DB_CONTAINER=my-postgres
PSQL = docker exec -i $(DB_CONTAINER) \
	env PGPASSWORD=$(DB_PASS) psql -h localhost -p 5432 -U $(DB_USER) -d $(DB_NAME)

MIGRATIONS_DIR = backend/migrations

.PHONY: help dev dev-backend dev-frontend migrate seed install install-backend install-frontend

# ── Default target ───────────────────────────────────────────
help:
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "  dev              Start backend and frontend dev servers (requires two terminals)"
	@echo "  dev-backend      Start the backend dev server (bun --watch)"
	@echo "  dev-frontend     Start the frontend dev server (vite)"
	@echo ""
	@echo "  install          Install all dependencies (backend + frontend)"
	@echo "  install-backend  Install backend dependencies via bun"
	@echo "  install-frontend Install frontend dependencies via npm"
	@echo ""
	@echo "  migrate          Run pending database migrations"
	@echo "  seed             Run the seed script to populate sample data"
	@echo ""
	@echo "  DB_HOST=$(DB_HOST)  DB_PORT=$(DB_PORT)  DB_NAME=$(DB_NAME)  DB_USER=$(DB_USER)"
	@echo ""

# ── Dev servers ──────────────────────────────────────────────
dev: dev-backend dev-frontend

dev-backend:
	cd backend && bun run dev

dev-frontend:
	cd frontend && npm run dev

# ── Install ──────────────────────────────────────────────────
install: install-backend install-frontend

install-backend:
	cd backend && bun install

install-frontend:
	cd frontend && npm install

# ── Database ─────────────────────────────────────────────────
migrate:
	cd backend && bun run migrate

seed:
	@echo "→ Running seed script..."
	$(PSQL) < $(MIGRATIONS_DIR)/seed.sql
	@echo "✓ Seed complete."
