#!/bin/bash

# 🛡️ Backup Dev Tables Before Schema Changes
# Usage: ./scripts/backup-dev-tables.sh

set -e  # Exit on any error

# Configuration
BACKUP_DIR="scripts/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_SESSION_DIR="$BACKUP_DIR/$TIMESTAMP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if AWS CLI is installed and configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "AWS CLI is configured and working"
}

# Function to get the Amplify app ID from amplify_outputs.json
get_amplify_info() {
    if [ ! -f "amplify_outputs.json" ]; then
        print_error "amplify_outputs.json not found. Make sure you're in the project root."
        exit 1
    fi
    
    # Extract the region from the amplify_outputs.json (try both auth and data sections)
    REGION=$(grep -o '"aws_region"[[:space:]]*:[[:space:]]*"[^"]*"' amplify_outputs.json | head -1 | cut -d'"' -f4)
    
    if [ -z "$REGION" ]; then
        print_error "Could not determine AWS region from amplify_outputs.json"
        exit 1
    fi
    
    print_status "Detected AWS region: $REGION"
}

# Function to get all DynamoDB tables with our app prefix
get_dev_tables() {
    print_status "Discovering dev tables..."
    
    # Get all tables and filter for ones that look like dev tables
    ALL_TABLES=$(aws dynamodb list-tables --region "$REGION" --output text --query 'TableNames[]' 2>/dev/null || echo "")
    
    if [ -z "$ALL_TABLES" ]; then
        print_error "No tables found or unable to list tables"
        exit 1
    fi
    
    # SAFETY: Explicitly exclude production tables
    PRODUCTION_PATTERN="xxxxxxxxxxxxxxxxxxxxxxxxxx"
    
    # First, try to find your specific dev environment (ends with 5ui)
    DEV_TABLES=""
    for table in $ALL_TABLES; do
        # CRITICAL: Skip production tables
        if [[ $table == *"$PRODUCTION_PATTERN"* ]]; then
            print_warning "⚠️  Skipping PRODUCTION table: $table"
            continue
        fi
        
        if [[ $table == *"5ui-NONE" ]]; then
            DEV_TABLES="$DEV_TABLES $table"
        fi
    done
    
    # If no 5ui tables found, fall back to all dev/sandbox tables
    if [ -z "$DEV_TABLES" ]; then
        print_warning "No tables ending in '5ui' found. Searching for all dev tables..."
        for table in $ALL_TABLES; do
            # CRITICAL: Skip production tables
            if [[ $table == *"$PRODUCTION_PATTERN"* ]]; then
                print_warning "⚠️  Skipping PRODUCTION table: $table"
                continue
            fi
            
            # Look for Amplify dev tables (pattern: ModelName-hash-NONE)
            # Also look for explicit sandbox/dev naming
            if [[ $table == *"-NONE" ]] || [[ $table == *"sandbox"* ]] || [[ $table == *"dev"* ]]; then
                # Skip production tables (if they have different patterns)
                if [[ $table != *"prod"* ]] && [[ $table != *"production"* ]]; then
                    DEV_TABLES="$DEV_TABLES $table"
                fi
            fi
        done
    else
        print_status "Found your dev environment tables (ending in 5ui)"
    fi
    
    if [ -z "$DEV_TABLES" ]; then
        print_warning "No dev tables found. Listing all available tables:"
        echo "$ALL_TABLES"
        read -p "Enter table names manually (space-separated): " DEV_TABLES
    fi
    
    print_status "Found dev tables: $DEV_TABLES"
}

# Function to backup a single table
backup_table() {
    local table_name=$1
    local output_file="$BACKUP_SESSION_DIR/${table_name}.json"
    
    print_status "Backing up table: $table_name"
    
    # Check if table exists
    if ! aws dynamodb describe-table --table-name "$table_name" --region "$REGION" &> /dev/null; then
        print_warning "Table $table_name does not exist, skipping..."
        return
    fi
    
    # Get item count first
    local item_count=$(aws dynamodb scan --table-name "$table_name" --region "$REGION" --select COUNT --output text --query 'Count' 2>/dev/null || echo "0")
    
    if [ "$item_count" -eq 0 ]; then
        print_warning "Table $table_name is empty, creating empty backup file..."
        echo '{"Items": [], "Count": 0, "TableName": "'$table_name'"}' > "$output_file"
        return
    fi
    
    print_status "Table $table_name has $item_count items"
    
    # Backup the table data
    if aws dynamodb scan --table-name "$table_name" --region "$REGION" --output json > "$output_file" 2>/dev/null; then
        print_success "✓ Backed up $table_name ($item_count items)"
    else
        print_error "✗ Failed to backup $table_name"
        return 1
    fi
}

# Function to create backup manifest
create_manifest() {
    local manifest_file="$BACKUP_SESSION_DIR/manifest.json"
    
    cat > "$manifest_file" << EOF
{
  "backup_timestamp": "$TIMESTAMP",
  "backup_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "aws_region": "$REGION",
  "tables_backed_up": [
$(for table in $DEV_TABLES; do
    if [ -f "$BACKUP_SESSION_DIR/${table}.json" ]; then
        echo "    \"$table\","
    fi
done | sed '$ s/,$//')
  ],
  "backup_directory": "$BACKUP_SESSION_DIR",
  "notes": "Pre-schema change backup created automatically"
}
EOF
    
    print_success "Created backup manifest: $manifest_file"
}

# Main execution
main() {
    echo ""
    echo "🛡️  AMPLIFY DEV TABLES BACKUP TOOL"
    echo "=================================="
    echo ""
    
    # Create backup directory for this session
    mkdir -p "$BACKUP_SESSION_DIR"
    
    # Pre-flight checks
    check_aws_cli
    get_amplify_info
    get_dev_tables
    
    echo ""
    print_status "Starting backup to: $BACKUP_SESSION_DIR"
    print_status "Timestamp: $TIMESTAMP"
    echo ""
    
    # Backup each table
    local backup_count=0
    local failed_count=0
    
    for table in $DEV_TABLES; do
        if backup_table "$table"; then
            ((backup_count++))
        else
            ((failed_count++))
        fi
    done
    
    # Create manifest
    create_manifest
    
    # Summary
    echo ""
    echo "📊 BACKUP SUMMARY"
    echo "================="
    print_success "Tables backed up: $backup_count"
    if [ "$failed_count" -gt 0 ]; then
        print_warning "Tables failed: $failed_count"
    fi
    print_status "Backup location: $BACKUP_SESSION_DIR"
    
    # Calculate total backup size
    local backup_size=$(du -sh "$BACKUP_SESSION_DIR" 2>/dev/null | cut -f1 || echo "Unknown")
    print_status "Total backup size: $backup_size"
    
    echo ""
    print_success "🎉 Backup completed successfully!"
    echo ""
    print_status "You can now safely run schema changes with:"
    echo "   npx ampx sandbox"
    echo ""
    print_status "To restore from this backup later, run:"
    echo "   ./scripts/restore-dev-tables.sh $TIMESTAMP"
    echo ""
}

# Run main function
main "$@" 