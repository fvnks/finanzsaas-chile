
import "isomorphic-fetch";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { ClientSecretCredential } from "@azure/identity";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env from root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function debugOneDrive() {
    console.log("--- Starting OneDrive Connection Debug ---");

    // 1. Check Env Vars
    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;

    console.log("Environment Variables Check:");
    console.log("AZURE_TENANT_ID:", tenantId ? "Set" : "MISSING");
    console.log("AZURE_CLIENT_ID:", clientId ? "Set" : "MISSING");
    console.log("AZURE_CLIENT_SECRET:", clientSecret ? "Set" : "MISSING");

    if (!tenantId || !clientId || !clientSecret) {
        console.error("❌ Blocking Error: Missing credentials.");
        return;
    }

    // 2. Initialize Client
    try {
        const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
        const authProvider = new TokenCredentialAuthenticationProvider(credential, {
            scopes: ["https://graph.microsoft.com/.default"],
        });

        const client = Client.initWithMiddleware({ authProvider });

        // 3. Test 1: Get Site Root
        console.log("\n--- Test 1: Fetching /sites/root (SharePoint Default) ---");
        try {
            const siteRoot = await client.api('/sites/root').get();
            console.log("✅ Success! Connected to SharePoint Root.");
            console.log("Site Name:", siteRoot.displayName);
        } catch (err: any) {
            console.error("❌ Failed to fetch /sites/root");
            console.error(`Status: ${err.statusCode} - ${err.code}`);
        }

        // 4. Test 2: List Drives (SharePoint)
        console.log("\n--- Test 2: Fetching /sites/root/drives ---");
        try {
            const drives = await client.api('/sites/root/drives').get();
            console.log(`✅ Success! Found ${drives.value.length} drives on root site.`);
        } catch (err: any) {
            console.error("❌ Failed to fetch /sites/root/drives");
            console.error(`Status: ${err.statusCode} - ${err.code}`);
        }

        // 5. Test 3: List Users (Fallback Strategy)
        console.log("\n--- Test 3: Fetching /users (To test User Drive access) ---");
        try {
            const users = await client.api('/users').top(1).get(); // Just get one
            console.log(`✅ Success! Found ${users.value.length} users.`);

            if (users.value.length > 0) {
                const user = users.value[0];
                console.log(`Testing access to drive of user: ${user.userPrincipalName}`);

                // Test 4: User Drive
                try {
                    const userDrive = await client.api(`/users/${user.id}/drive`).get();
                    console.log("✅ Success! Can access User Drive.");
                    console.log(`Drive ID: ${userDrive.id}`);
                    console.log(`\n*** SUGGESTION: ***`);
                    console.log(`If SharePoint (Test 1) fails but User Drive (Test 4) works, update the code to use:`);
                    console.log(`client.api('/users/${user.id}/drive/root:/{path}:/content')`);
                } catch (uErr: any) {
                    console.error("❌ Failed to access User Drive");
                    console.error(`Status: ${uErr.statusCode} - ${uErr.code}`);
                }
            }
        } catch (err: any) {
            console.error("❌ Failed to fetch /users");
            console.error(`Status: ${err.statusCode} - ${err.code}`);
            if (err.statusCode === 401) console.error("-> Hint: 'User.Read.All' (Application) might be missing.");
        }
    } catch (err: any) {
        console.error("❌ Fatal Error initializing client:", err);
    }
}

debugOneDrive();
