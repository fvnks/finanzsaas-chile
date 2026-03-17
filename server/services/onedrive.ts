
import "isomorphic-fetch";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { ClientSecretCredential } from "@azure/identity";

// NOTE: These variables should be in your .env file
const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;

let graphClient: Client | null = null;

function getGraphClient() {
    if (graphClient) return graphClient;

    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
        throw new Error("Azure credentials (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET) are missing.");
    }

    const credential = new ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ["https://graph.microsoft.com/.default"],
    });

    graphClient = Client.initWithMiddleware({
        authProvider,
    });

    return graphClient;
}

// Optional: Set this to upload to a specific user's OneDrive instead of the main SharePoint site
const DRIVE_USER = process.env.AZURE_DRIVE_USER;

/**
 * Uploads a file to a specific path in OneDrive/SharePoint
 * @param fileBuffer The file content as a Buffer
 * @param fileName The name of the file
 * @param folderPath The folder path (e.g., "/Planos-SaaS/Planos") - Must start with /
 * @returns The webUrl of the uploaded file
 */
export async function uploadToOneDrive(fileBuffer: Buffer, fileName: string, folderPath: string): Promise<{ webUrl: string, id: string }> {
    const client = getGraphClient();

    // Ensure folder path format
    const cleanPath = folderPath.startsWith('/') ? folderPath : `/${folderPath}`;
    const filePath = `${cleanPath}/${fileName}`;

    try {
        let apiPath = '';

        if (DRIVE_USER) {
            // Target specific user's OneDrive (Personal Business Drive)
            // Requires 'Files.ReadWrite.All' Application Permission
            console.log(`Uploading to User Drive: ${DRIVE_USER}`);
            apiPath = `/users/${DRIVE_USER}/drive/root:${filePath}:/content`;
        } else {
            // Target Organization's Default SharePoint Site
            // Requires 'Sites.ReadWrite.All' Application Permission
            console.log(`Uploading to SharePoint Root Site`);
            apiPath = `/sites/root/drive/root:${filePath}:/content`;
        }

        const result = await client.api(apiPath).put(fileBuffer);

        return {
            webUrl: result.webUrl,
            id: result.id
        };
    } catch (error: any) {
        console.error("Error uploading to OneDrive:", JSON.stringify(error, null, 2));

        // Enhance logging for common errors
        if (error.statusCode === 401) {
            console.error("AUTH ERROR: Check Azure 'Files.ReadWrite.All' permission and 'Grant Admin Consent'.");
        }
        if (error.statusCode === 403) {
            console.error("FORBIDDEN: App does not have write access to the target resource.");
        }
        if (error.statusCode === 404) {
            console.error("NOT FOUND: The target User or SharePoint Site was not found.");
            if (DRIVE_USER) console.error(`Verify email '${DRIVE_USER}' is correct and has a OneDrive set up.`);
        }

        throw new Error("Failed to upload file to OneDrive: " + (error.message || "Unknown Error"));
    }
}

/**
 * Gets a readable stream of the file content from a OneDrive Web URL
 * Uses the Global Shares API (u! encoding)
 */
export async function getFileStreamFromWebUrl(webUrl: string): Promise<any> {
    const client = getGraphClient();

    try {
        // Encoding logic from Microsoft docs for /shares/{id}
        // 1. Base64 encode
        const encoded = Buffer.from(webUrl).toString('base64');
        // 2. Make it URL safe (replace / with _ and + with -) and remove trailing =
        const safeEncoded = "u!" + encoded.replace(/\//g, '_').replace(/\+/g, '-').replace(/=+$/, '');

        // 3. Get content
        const stream = await client.api(`/shares/${safeEncoded}/driveItem/content`).getStream();
        return stream;
    } catch (error) {
        console.error("Error getting stream from OneDrive:", error);
        throw new Error("Failed to get file stream");
    }
}
