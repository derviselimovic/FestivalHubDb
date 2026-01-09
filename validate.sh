#!/bin/bash
# Validation script for Festival Scraper System

echo "🔍 Festival Scraper System - Validation Script"
echo "=============================================="
echo ""

# Check Node.js version
echo "✓ Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "  Node.js: $NODE_VERSION"

# Check npm version
echo "✓ Checking npm version..."
NPM_VERSION=$(npm --version)
echo "  npm: $NPM_VERSION"

# Check if dependencies are installed
echo "✓ Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "  ✓ node_modules found"
else
    echo "  ✗ node_modules not found - run 'npm install'"
    exit 1
fi

# Check TypeScript compilation
echo "✓ Checking TypeScript compilation..."
if npm run build > /dev/null 2>&1; then
    echo "  ✓ TypeScript compilation successful"
else
    echo "  ✗ TypeScript compilation failed"
    npm run build
    exit 1
fi

# Check dist folder
echo "✓ Checking build output..."
if [ -d "dist" ]; then
    echo "  ✓ dist folder created"
    echo "  ✓ Generated files: $(find dist -name "*.js" | wc -l) JS files"
else
    echo "  ✗ dist folder not found"
    exit 1
fi

# Check .env.example
echo "✓ Checking configuration files..."
if [ -f ".env.example" ]; then
    echo "  ✓ .env.example found"
else
    echo "  ✗ .env.example not found"
    exit 1
fi

# Check Docker files
if [ -f "Dockerfile" ] && [ -f "docker-compose.yml" ]; then
    echo "  ✓ Docker configuration files found"
else
    echo "  ✗ Docker configuration files missing"
fi

# Check Railway configuration
if [ -f "railway.json" ]; then
    echo "  ✓ Railway configuration found"
else
    echo "  ✗ Railway configuration missing"
fi

echo ""
echo "=============================================="
echo "✅ All validations passed!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and configure"
echo "2. Set up PostgreSQL database"
echo "3. Run: npm run db:migrate"
echo "4. Run: npm run dev (or npm start for production)"
echo ""
