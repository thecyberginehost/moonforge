#!/bin/bash
# FILE PATH: deploy-program.sh (in project root, same level as package.json)
# ACTION: CREATE NEW FILE and make executable with: chmod +x deploy-program.sh
# PURPOSE: Deploy your Anchor program to Solana devnet

echo "=========================================="
echo "🚀 MOONFORGE ANCHOR PROGRAM DEPLOYMENT"
echo "=========================================="

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor is not installed. Installing..."
    echo "This may take a few minutes..."
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install latest
    avm use latest
else
    echo "✅ Anchor is installed"
fi

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI is not installed. Please install it first:"
    echo "sh -c \"\$(curl -sSfL https://release.solana.com/stable/install)\""
    exit 1
else
    echo "✅ Solana CLI is installed"
fi

# Set Solana to devnet
echo "🌐 Setting Solana to devnet..."
solana config set --url devnet

# Navigate to program directory
if [ -d "solana-program" ]; then
    cd solana-program
elif [ -d "programs" ]; then
    cd programs
else
    echo "❌ Could not find Anchor program directory"
    echo "Expected 'solana-program' or 'programs' directory"
    exit 1
fi

# Build the program
echo "📦 Building Anchor program..."
anchor build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check for errors above."
    exit 1
fi

# Get the program ID
if [ -f "target/deploy/bonding_curve-keypair.json" ]; then
    PROGRAM_ID=$(solana address -k target/deploy/bonding_curve-keypair.json)
elif [ -f "target/deploy/moonforge-keypair.json" ]; then
    PROGRAM_ID=$(solana address -k target/deploy/moonforge-keypair.json)
else
    echo "❌ Could not find program keypair. Check target/deploy/ directory"
    exit 1
fi

echo "📝 Program ID: $PROGRAM_ID"

# Update Anchor.toml with the new program ID
echo "📝 Updating Anchor.toml..."
if [ -f "Anchor.toml" ]; then
    # Replace the placeholder program ID
    sed -i.bak "s/11111111111111111111111111111111/$PROGRAM_ID/g" Anchor.toml
    echo "✅ Updated Anchor.toml with new program ID"
else
    echo "⚠️  Could not find Anchor.toml"
fi

# Check wallet balance
echo "💰 Checking wallet balance..."
BALANCE=$(solana balance)
echo "Current balance: $BALANCE"

# Request airdrop if balance is low
if [[ $(echo "$BALANCE" | cut -d' ' -f1 | cut -d'.' -f1) -lt 2 ]]; then
    echo "💸 Requesting airdrop..."
    solana airdrop 2
    sleep 5
fi

# Deploy to devnet
echo "🚀 Deploying to devnet..."
echo "This may take a minute..."
anchor deploy --provider.cluster devnet

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed. Common issues:"
    echo "  - Insufficient SOL (run: solana airdrop 2)"
    echo "  - Network issues (try again)"
    echo "  - Program too large (optimize code)"
    exit 1
fi

# Go back to project root
cd ..

# Update .env.local with the new program ID
echo "📝 Updating .env.local with new program ID..."
if [ -f ".env.local" ]; then
    # Update the program ID in .env.local
    sed -i.bak "s/VITE_BONDING_CURVE_PROGRAM_ID=.*/VITE_BONDING_CURVE_PROGRAM_ID=$PROGRAM_ID/g" .env.local
    echo "✅ Updated .env.local"
else
    echo "⚠️  .env.local not found. Please update manually:"
    echo "    VITE_BONDING_CURVE_PROGRAM_ID=$PROGRAM_ID"
fi

# Call Supabase function to update program ID in database
echo "💾 Updating database with new program ID..."
SUPABASE_URL="https://llvakqunvvheajwejpzm.supabase.co"

# Check if we have the anon key
if [ -f ".env.local" ]; then
    ANON_KEY=$(grep "VITE_SUPABASE_ANON_KEY=" .env.local | cut -d'=' -f2)
    if [ ! -z "$ANON_KEY" ] && [ "$ANON_KEY" != "your-anon-key-here" ]; then
        curl -X POST "$SUPABASE_URL/functions/v1/update-program-id" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $ANON_KEY" \
          -d "{\"programId\": \"$PROGRAM_ID\", \"network\": \"devnet\"}"
        echo "✅ Database updated"
    else
        echo "⚠️  Could not update database - missing Supabase anon key"
    fi
fi

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo "Program ID: $PROGRAM_ID"
echo ""
echo "Next steps:"
echo "1. Verify .env.local has been updated"
echo "2. Restart your development server (npm run dev)"
echo "3. Test token creation"
echo ""
echo "Your program is live on Solana devnet!"
echo "Explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo "=========================================="