#!/bin/bash

# 🔄 Restore Dev Tables From Backup
# Usage: ./scripts/restore-dev-tables.sh [backup_timestamp]

set -e  # Exit on any error

# Configuration
BACKUP_DIR="scripts/backups"
BACKUP_TIMESTAMP=$1

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

# Function to show usage
show_usage() {
    echo "Usage: $0 [backup_timestamp]"
    echo ""
    echo "Available backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR" | grep "^d" | awk '{print "  " $9}' | grep -v "^\.$\|^\.\.$"
    else
        echo "  No backups found"
    fi
    echo ""
    echo "Example: $0 20250523_145228"
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

# Function to get AWS region
get_amplify_info() {
    if [ ! -f "amplify_outputs.json" ]; then
        print_error "amplify_outputs.json not found. Make sure you're in the project root."
        exit 1
    fi
    
    # Extract the region from the amplify_outputs.json
    REGION=$(grep -o '"aws_region":"[^"]*"' amplify_outputs.json | cut -d'"' -f4)
    
    if [ -z "$REGION" ]; then
        print_error "Could not determine AWS region from amplify_outputs.json"
        exit 1
    fi
    
    print_status "Detected AWS region: $REGION"
}

# Function to validate backup directory
validate_backup() {
    local backup_path="$BACKUP_DIR/$BACKUP_TIMESTAMP"
    
    if [ ! -d "$backup_path" ]; then
        print_error "Backup directory not found: $backup_path"
        show_usage
        exit 1
    fi
    
    if [ ! -f "$backup_path/manifest.json" ]; then
        print_error "Backup manifest not found: $backup_path/manifest.json"
        exit 1
    fi
    
    print_success "Backup found: $backup_path"
}

# Function to restore a single table
restore_table() {
    local table_name=$1
    local backup_file="$BACKUP_DIR/$BACKUP_TIMESTAMP/${table_name}.json"
    
    # CRITICAL SAFETY CHECK: Never restore to production tables
    PRODUCTION_PATTERN="xxxxxxxxxxxxxxxxxxxxxxxxxx"
    if [[ $table_name == *"$PRODUCTION_PATTERN"* ]]; then
        print_error "🚨 BLOCKED: Cannot restore to PRODUCTION table: $table_name"
        print_error "This script is only for DEV tables. Production tables are protected."
        return 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_warning "Backup file not found for table: $table_name"
        return 1
    fi
    
    print_status "Restoring table: $table_name"
    
    # Check if table exists
    if ! aws dynamodb describe-table --table-name "$table_name" --region "$REGION" &> /dev/null; then
        print_error "Target table $table_name does not exist. Cannot restore to non-existent table."
        return 1
    fi
    
    # Get the items from backup file
    local items=$(cat "$backup_file" | jq -r '.Items')
    local item_count=$(echo "$items" | jq -r 'length')
    
    if [ "$item_count" -eq 0 ]; then
        print_warning "No items to restore for table: $table_name"
        return 0
    fi
    
    print_status "Restoring $item_count items to $table_name"
    
    # Clear existing table data first (optional - comment out if you want to merge)
    print_warning "Clearing existing data in $table_name..."
    local existing_items=$(aws dynamodb scan --table-name "$table_name" --region "$REGION" --output json --query 'Items[].{id: id}' 2>/dev/null || echo '[]')
    
    if [ "$existing_items" != "[]" ]; then
        echo "$existing_items" | jq -r '.[] | .id.S' | while read -r item_id; do
            if [ -n "$item_id" ]; then
                aws dynamodb delete-item --table-name "$table_name" --region "$REGION" --key '{"id":{"S":"'$item_id'"}}' &> /dev/null || true
            fi
        done
    fi
    
    # Restore items in batches (DynamoDB batch write has 25 item limit)
    local batch_size=25
    local batch_count=0
    
    echo "$items" | jq -c --argjson size $batch_size '[_ntos:inputs] | .[0:$size], .[($size):]' | while IFS= read -r batch; do
        if [ "$batch" = "null" ] || [ "$batch" = "[]" ]; then
            continue
        fi
        
        ((batch_count++))
        
        # Create batch write request
        local put_requests=$(echo "$batch" | jq -c 'map({"PutRequest": {"Item": .}})')
        local batch_request='{"'$table_name'": '$put_requests'}'
        
        # Execute batch write
        if aws dynamodb batch-write-item --region "$REGION" --request-items "$batch_request" &> /dev/null; then
            print_status "✓ Restored batch $batch_count"
        else
            print_error "✗ Failed to restore batch $batch_count"
            return 1
        fi
        
        # Small delay to avoid throttling
        sleep 0.1
    done
    
    print_success "✓ Restored $table_name ($item_count items)"
}

# Function to show backup information
show_backup_info() {
    local manifest_file="$BACKUP_DIR/$BACKUP_TIMESTAMP/manifest.json"
    
    echo ""
    echo "📋 BACKUP INFORMATION"
    echo "===================="
    
    if [ -f "$manifest_file" ]; then
        local backup_date=$(jq -r '.backup_date' "$manifest_file")
        local backup_region=$(jq -r '.aws_region' "$manifest_file")
        local tables=$(jq -r '.tables_backed_up[]' "$manifest_file" | tr '\n' ' ')
        
        print_status "Backup Date: $backup_date"
        print_status "Region: $backup_region"
        print_status "Tables: $tables"
    else
        print_warning "Manifest file not found"
    fi
    echo ""
}

# Main execution
main() {
    echo ""
    echo "🔄 AMPLIFY DEV TABLES RESTORE TOOL"
    echo "=================================="
    echo ""
    
    # Check if backup timestamp provided
    if [ -z "$BACKUP_TIMESTAMP" ]; then
        print_error "No backup timestamp provided"
        show_usage
        exit 1
    fi
    
    # Pre-flight checks
    check_aws_cli
    get_amplify_info
    validate_backup
    
    # Show backup information
    show_backup_info
    
    # Get tables from manifest
    local manifest_file="$BACKUP_DIR/$BACKUP_TIMESTAMP/manifest.json"
    local tables_to_restore=$(jq -r '.tables_backed_up[]' "$manifest_file" 2>/dev/null || echo "")
    
    if [ -z "$tables_to_restore" ]; then
        print_error "No tables found in backup manifest"
        exit 1
    fi
    
    # Confirmation prompt
    echo "⚠️  WARNING: This will OVERWRITE existing data in your dev tables!"
    echo ""
    print_status "Tables to restore: $tables_to_restore"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_warning "Restore cancelled by user"
        exit 0
    fi
    
    echo ""
    print_status "Starting restore from: $BACKUP_DIR/$BACKUP_TIMESTAMP"
    echo ""
    
    # Restore each table
    local restore_count=0
    local failed_count=0
    
    for table in $tables_to_restore; do
        if restore_table "$table"; then
            ((restore_count++))
        else
            ((failed_count++))
        fi
    done
    
    # Summary
    echo ""
    echo "📊 RESTORE SUMMARY"
    echo "=================="
    print_success "Tables restored: $restore_count"
    if [ "$failed_count" -gt 0 ]; then
        print_warning "Tables failed: $failed_count"
    fi
    
    echo ""
    if [ "$failed_count" -eq 0 ]; then
        print_success "🎉 Restore completed successfully!"
    else
        print_warning "⚠️  Restore completed with some failures"
    fi
    echo ""
}

# Check if jq is installed (required for JSON processing)
if ! command -v jq &> /dev/null; then
    print_error "jq is required but not installed. Please install it:"
    echo "  macOS: brew install jq"
    echo "  Ubuntu: sudo apt-get install jq"
    exit 1
fi

# Run main function
main "$@" 