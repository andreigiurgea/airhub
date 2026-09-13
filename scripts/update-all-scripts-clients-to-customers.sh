#!/bin/bash

# This script updates all references from 'clients' to 'customers' in TypeScript files
# It uses sed to perform the replacement

cd "$(dirname "$0")"

echo "Updating all script files to use 'customers' instead of 'clients'..."

# Find all .ts files and replace 'clients' with 'customers'
find . -name "*.ts" -type f | while read file; do
    # Skip the migration script itself and already updated files
    if [[ "$file" != *"migrate-clients-to-customers"* ]] && [[ "$file" != *"update-all-scripts"* ]]; then
        # Create backup
        cp "$file" "$file.bak"

        # Replace patterns
        sed -i "s/'clients'/'customers'/g" "$file"
        sed -i 's/"clients"/"customers"/g' "$file"
        sed -i "s/clientsRef/customersRef/g" "$file"
        sed -i "s/clientsQuery/customersQuery/g" "$file"
        sed -i "s/clientsSnapshot/customersSnapshot/g" "$file"
        sed -i "s/clientDoc/customerDoc/g" "$file"
        sed -i "s/clientData/customerData/g" "$file"
        sed -i "s/clientId/customerId/g" "$file"
        sed -i "s/clientDocRef/customerDocRef/g" "$file"
        sed -i "s/clientQuery/customerQuery/g" "$file"
        sed -i "s/clientSnapshot/customerSnapshot/g" "$file"

        # Remove backup if successful
        rm "$file.bak"

        echo "  ✓ Updated: $file"
    fi
done

echo ""
echo "✅ All scripts updated successfully!"
echo ""
echo "Note: This script replaced:"
echo "  - 'clients' → 'customers'"
echo "  - Variable names (clientsRef → customersRef, etc.)"
