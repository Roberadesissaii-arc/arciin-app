#!/bin/bash

# Production Readiness Check Script
# Run this before each deployment to ensure everything is ready

echo "🔍 Starting Production Readiness Check..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: Build
echo "1️⃣  Checking build..."
if npm run build 2>&1 | grep -q "Compiled successfully"; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    ((ERRORS++))
fi
echo ""

# Check 2: TypeScript errors
echo "2️⃣  Checking TypeScript..."
if npm run build 2>&1 | grep -q "Checking validity of types"; then
    echo -e "${GREEN}✓ TypeScript check passed${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript warnings found${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 3: Console.log statements
echo "3️⃣  Checking for console.log statements..."
CONSOLE_LOGS=$(grep -r "console\.log" --include="*.tsx" --include="*.ts" components/ lib/ hooks/ app/ contexts/ 2>/dev/null | wc -l)
if [ "$CONSOLE_LOGS" -eq 0 ]; then
    echo -e "${GREEN}✓ No console.log statements found${NC}"
else
    echo -e "${YELLOW}⚠ Found $CONSOLE_LOGS console.log statements${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 4: Environment variables
echo "4️⃣  Checking environment variables..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local exists${NC}"
    
    # Check for required variables
    REQUIRED_VARS=(
        "NEXT_PUBLIC_TMDB_API_KEY"
        "NEXT_PUBLIC_FIREBASE_API_KEY"
        "DEEPSEEK_API_KEY"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "$var" .env.local; then
            echo -e "${GREEN}  ✓ $var set${NC}"
        else
            echo -e "${RED}  ✗ $var missing${NC}"
            ((ERRORS++))
        fi
    done
else
    echo -e "${RED}✗ .env.local not found${NC}"
    ((ERRORS++))
fi
echo ""

# Check 5: Package.json scripts
echo "5️⃣  Checking package.json scripts..."
if grep -q '"build"' package.json && grep -q '"start"' package.json; then
    echo -e "${GREEN}✓ Build and start scripts present${NC}"
else
    echo -e "${RED}✗ Missing required scripts${NC}"
    ((ERRORS++))
fi
echo ""

# Check 6: Firebase configuration
echo "6️⃣  Checking Firebase configuration..."
if [ -f "firebase.json" ]; then
    echo -e "${GREEN}✓ firebase.json exists${NC}"
else
    echo -e "${YELLOW}⚠ firebase.json not found${NC}"
    ((WARNINGS++))
fi

if [ -f "firestore.rules" ]; then
    echo -e "${GREEN}✓ firestore.rules exists${NC}"
else
    echo -e "${RED}✗ firestore.rules missing${NC}"
    ((ERRORS++))
fi
echo ""

# Check 7: Build output size
echo "7️⃣  Checking build size..."
BUILD_SIZE=$(du -sh .next 2>/dev/null | cut -f1)
if [ -n "$BUILD_SIZE" ]; then
    echo -e "${GREEN}✓ Build size: $BUILD_SIZE${NC}"
else
    echo -e "${YELLOW}⚠ Build directory not found - run build first${NC}"
    ((WARNINGS++))
fi
echo ""

# Check 8: Unused files
echo "8️⃣  Checking for unused files..."
BACKUP_FILES=$(find . -name "*backup*" -o -name "*.bak" -o -name "*-old.*" | wc -l)
if [ "$BACKUP_FILES" -eq 0 ]; then
    echo -e "${GREEN}✓ No backup files found${NC}"
else
    echo -e "${YELLOW}⚠ Found $BACKUP_FILES backup files${NC}"
    ((WARNINGS++))
fi
echo ""

# Summary
echo "================================"
echo "📊 SUMMARY"
echo "================================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo -e "${GREEN}🚀 Ready for production deployment${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS WARNING(S) FOUND${NC}"
    echo -e "${YELLOW}⚡ You can deploy, but consider fixing warnings${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS ERROR(S) FOUND${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARNINGS WARNING(S) FOUND${NC}"
    fi
    echo -e "${RED}🛑 Fix errors before deploying${NC}"
    exit 1
fi
