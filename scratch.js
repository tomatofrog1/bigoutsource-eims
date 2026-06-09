import { env } from './server/src/config/env.js';
import { supabaseRequest } from './server/src/config/supabase.js';

async function check() {
  try {
    console.log("Supabase URL:", env.supabase.url);
    const rows = await supabaseRequest('accounts', {
      searchParams: {
        limit: '5'
      }
    });
    console.log("First 5 accounts rows:");
    console.log(JSON.stringify(rows, null, 2));

    // Try to update one account to see if there is an error
    if (rows && rows.length > 0) {
      const id = rows[0].id;
      const originalType = rows[0].account_type;
      console.log(`\nTesting update on account ${id} (current type: ${originalType})`);
      const targetType = originalType === 'internal' ? 'external' : 'internal';
      
      const updateResult = await supabaseRequest('accounts', {
        method: 'PATCH',
        searchParams: { id: `eq.${id}` },
        body: { account_type: targetType }
      });
      console.log("Update result payload:", JSON.stringify(updateResult, null, 2));

      // Revert back
      await supabaseRequest('accounts', {
        method: 'PATCH',
        searchParams: { id: `eq.${id}` },
        body: { account_type: originalType }
      });
      console.log("Successfully reverted update.");
    } else {
      console.log("No accounts found in the table.");
    }
  } catch (error) {
    console.error("Error checking database:", error);
  }
}

check();
