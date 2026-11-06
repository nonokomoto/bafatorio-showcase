# 🛡️ Dev Tables Backup & Restore System

**Quick protection for your Amplify dev tables against schema change data loss.**

## 🚀 Quick Start (2 Steps)

### 1. Before ANY Schema Changes:
```bash
./scripts/backup-dev-tables.sh
```

### 2. If Data Gets Lost:
```bash
./scripts/restore-dev-tables.sh [timestamp]
```

## 📋 Prerequisites (One-Time Setup)

```bash
# Install required tools (macOS)
brew install awscli jq

# Configure AWS CLI
aws configure
```

## 🛠️ Your Workflow

### Step 1: Backup Before Changes
```bash
# Always run this FIRST!
./scripts/backup-dev-tables.sh
```

**What happens:**
- ✅ Finds your dev tables (ending in `5ui`)
- ✅ Skips production tables (protected automatically)
- ✅ Creates timestamped backup
- ✅ Shows summary with timestamp to save

**Example output:**
```
🛡️ AMPLIFY DEV TABLES BACKUP TOOL
[SUCCESS] Tables backed up: 14
[INFO] Backup location: scripts/backups/20250523_153738

To restore later: ./scripts/restore-dev-tables.sh 20250523_153738
```

### Step 2: Make Your Schema Changes
```bash
# Edit your schema
nano amplify/data/resource.ts

# Deploy changes (might lose data!)
npx ampx sandbox
```

### Step 3: Check If Data Survived
- Go to AWS Console → DynamoDB
- Check your tables for data
- If empty → Go to Step 4

### Step 4: Restore If Needed
```bash
# If data was lost, restore it
./scripts/restore-dev-tables.sh 20250523_153738
```

## 🔒 Safety Features

### Your Tables:
- ✅ **Dev tables**: `*xxxxxxxxxxxxxxxxxxxxxxxxxx-NONE` (backed up)
- 🚨 **Production**: `*xxxxxxxxxxxxxxxxxxxxxxxxxx-NONE` (protected)

### Automatic Protection:
- Production tables are **NEVER touched**
- Clear warnings show protected tables
- Restore blocks production accidentally

## 📁 Backup Management

### See Available Backups:
```bash
ls scripts/backups/
```

### Clean Old Backups:
```bash
# Keep only latest (manual cleanup)
rm -rf scripts/backups/[old-timestamp]
```

### Check Backup Size:
```bash
du -sh scripts/backups/
```

## 🆘 Emergency Recovery

### 1. No Backup Made?
```bash
# Check AWS Console → DynamoDB → Table → Backups
# Look for Point-in-Time Recovery options
```

### 2. Script Not Working?
```bash
# Check permissions
chmod +x scripts/backup-dev-tables.sh scripts/restore-dev-tables.sh

# Test AWS access
aws dynamodb list-tables
```

### 3. Wrong Tables Being Backed Up?
The script targets tables ending in `5ui`. If your dev environment changes, update this pattern in `backup-dev-tables.sh`:
```bash
if [[ $table == *"YOUR_NEW_PATTERN"* ]]; then
```

## ⚡ Quick Reference

| Action | Command |
|--------|---------|
| **Backup** | `./scripts/backup-dev-tables.sh` |
| **Restore** | `./scripts/restore-dev-tables.sh [timestamp]` |
| **List backups** | `ls scripts/backups/` |
| **Check size** | `du -sh scripts/backups/` |

## 🎯 Best Practices

1. **ALWAYS backup before schema changes**
2. **Save the timestamp** from backup output
3. **Test in dev first** (you're already doing this!)
4. **Clean old backups** regularly
5. **Never run restore on production** (it's blocked anyway)

---

**🛡️ Created to save you from "Amplify ate my data" disasters!**

**Remember**: `backup-first` → `schema-change` → `restore-if-needed` 