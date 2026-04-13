# --------------------------------------------------
# Configuration
# --------------------------------------------------

IMAGE_APP := body-map
CONTAINER_BIN := container

WORKDIR := /app

RUN := $(CONTAINER_BIN) run -it --rm \
	-v "$(PWD):$(WORKDIR)" \
	-v node_modules_cache:$(WORKDIR)/node_modules \
	-p 5173:5173 \
	$(IMAGE_APP)

.PHONY: \
	all help bootstrap image ensure-deps \
	dev build preview \
	test test-agent lint format validate \
	shell install ci \
	stop clean clean-volumes

# --------------------------------------------------
# Default Target
# --------------------------------------------------

all: validate ## Run full validation suite

# --------------------------------------------------
# Help (self-documenting CLI)
# --------------------------------------------------

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	| awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

# --------------------------------------------------
# Container Image
# --------------------------------------------------

image: ## Build dev container image
	@echo "🔨 Building container image..."
	$(CONTAINER_BIN) build -t $(IMAGE_APP) .

# --------------------------------------------------
# Dependency Management
# --------------------------------------------------

ensure-deps: ## Install dependencies if missing
	@echo "📦 Ensuring dependencies..."
	$(RUN) sh -c '[ -f node_modules/.package-lock.json ] || npm ci'

install: ensure-deps ## Force dependency install

bootstrap: image ensure-deps ## First-time project setup

# --------------------------------------------------
# App Lifecycle (mirrors package.json)
# --------------------------------------------------

dev: ensure-deps ## Start Vite dev server
	@echo "🚀 Starting dev server..."
	$(RUN) npm run dev

build: ensure-deps ## Production build
	@echo "🏗️ Building application..."
	$(RUN) npm run build

preview: ensure-deps ## Preview production build
	@echo "👀 Preview build..."
	$(RUN) npm run preview

test: ensure-deps ## Run test suite
	@echo "🧪 Running tests..."
	$(RUN) npm test

test-agent: ensure-deps ## Agent-compatible tests
	@echo "🤖 Running agent tests..."
	$(RUN) npm run test:agent

lint: ensure-deps ## Run ESLint
	@echo "🔍 Linting..."
	$(RUN) npm run lint

format: ensure-deps ## Format code
	@echo "🎨 Formatting..."
	$(RUN) npm run format

validate: ensure-deps ## Lint + test validation
	@echo "✅ Running validation suite..."
	$(RUN) sh -c "npm run lint && npm test"

# --------------------------------------------------
# CI Parity
# --------------------------------------------------

ci: validate build ## CI pipeline entrypoint

# --------------------------------------------------
# Developer Utilities
# --------------------------------------------------

shell: ## Open interactive shell in container
	$(RUN) bash

# --------------------------------------------------
# Cleanup
# --------------------------------------------------

stop: ## Stop running container (if named)
	-$(CONTAINER_BIN) stop $(IMAGE_APP)

clean-volumes: ## Remove dependency cache
	-$(CONTAINER_BIN) volume rm node_modules_cache
	-$(CONTAINER_BIN) volume prune -f

clean: stop clean-volumes ## Full cleanup
	-$(CONTAINER_BIN) image rm $(IMAGE_APP)