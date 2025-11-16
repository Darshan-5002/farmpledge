import { Client, Storage, Databases, ID, Query } from "appwrite";

// Appwrite configuration
const appwriteEndpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const appwriteProjectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const appwriteBucketId = import.meta.env.VITE_APPWRITE_BUCKET_ID;
const appwriteDatabaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID || "farmpledge";

// Check if Appwrite is configured
const isAppwriteConfigured = 
  appwriteProjectId && 
  appwriteProjectId !== "undefined";

let client: Client | null = null;
let storage: Storage | null = null;
let databases: Databases | null = null;

try {
  if (isAppwriteConfigured) {
    client = new Client()
      .setEndpoint(appwriteEndpoint)
      .setProject(appwriteProjectId);
    
    storage = new Storage(client);
    databases = new Databases(client);
    
    console.log("Appwrite initialized successfully");
  } else {
    console.warn("Appwrite not configured. Please set environment variables:");
    console.warn("  - VITE_APPWRITE_ENDPOINT (optional, defaults to cloud.appwrite.io/v1)");
    console.warn("  - VITE_APPWRITE_PROJECT_ID");
    console.warn("  - VITE_APPWRITE_BUCKET_ID (for storage)");
    console.warn("  - VITE_APPWRITE_DATABASE_ID (optional, defaults to 'farmpledge')");
  }
} catch (error) {
  console.error("Appwrite initialization error:", error);
  client = null;
  storage = null;
  databases = null;
}

// Helper function to set session (call this after user logs in)
export const setAppwriteSession = (session: string) => {
  if (client) {
    client.setSession(session);
  }
};

export { client, storage, databases, ID, Query, appwriteDatabaseId };
export default { client, storage, databases, ID, Query, appwriteDatabaseId };


