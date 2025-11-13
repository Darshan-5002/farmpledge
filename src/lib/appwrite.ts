import { Client, Storage, ID } from "appwrite";

// Appwrite configuration
const appwriteEndpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const appwriteProjectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const appwriteBucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;

// Check if Appwrite is configured
const isAppwriteConfigured = 
  appwriteProjectId && 
  appwriteBucketId &&
  appwriteProjectId !== "undefined" &&
  appwriteBucketId !== "undefined";

let client: Client | null = null;
let storage: Storage | null = null;

try {
  if (isAppwriteConfigured) {
    client = new Client()
      .setEndpoint(appwriteEndpoint)
      .setProject(appwriteProjectId);
    
    storage = new Storage(client);
    
    console.log("Appwrite initialized successfully");
  } else {
    console.warn("Appwrite not configured. Please set environment variables:");
    console.warn("  - VITE_APPWRITE_ENDPOINT (optional, defaults to cloud.appwrite.io/v1)");
    console.warn("  - VITE_APPWRITE_PROJECT_ID");
    console.warn("  - VITE_APPWRITE_BUCKET_ID");
  }
} catch (error) {
  console.error("Appwrite initialization error:", error);
  client = null;
  storage = null;
}

// Helper function to set session (call this after user logs in)
export const setAppwriteSession = (session: string) => {
  if (client) {
    client.setSession(session);
  }
};

export { client, storage, ID };
export default { client, storage, ID };


