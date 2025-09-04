# Dinky Metal ERP - Deployment Guide

## Database Setup

1. **Main Schema**: Run `database_schema_complete.sql` first
2. **User System**: Run `create_users_system.sql` for authentication
3. **Optional Features**:
   - `add_barcode_system.sql` - Barcode improvements (already included in main schema)
   - `add_overtime_system.sql` - Overtime enhancements (if overtime_hours column missing)

## Environment Variables

### For Netlify/Production:
```
SUPABASE_URL=https://spmtwsxrnclkxmqwsxdf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwbXR3c3hybmNsa3htcXdzeGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4ODAyODUsImV4cCI6MjA3MjQ1NjI4NX0.BpwVkvqpzAP2hroqztXmQNym5Mq_Kijnt9CPG50yP0c
```

## User Accounts

- **Admin**: admin@dinky.com / admin123
- **Admin2**: yonetim@dinky.com / admin123  
- **Warehouse**: depo@dinky.com / depo123
- **Accounting**: muhasebe@dinky.com / muhasebe123

## File Structure

```
dinky-metal-erp/
├── index.html          # Main application page
├── login.html           # Authentication page
├── css/                 # Styles
├── js/                  # JavaScript modules
├── node_modules/        # Dependencies (production only)
└── *.sql               # Database setup files
```