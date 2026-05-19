type RequiredPublicEnvName =
  | "NEXT_PUBLIC_API_URL"
  | "NEXT_PUBLIC_FIREBASE_API_KEY"
  | "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
  | "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  | "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"
  | "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
  | "NEXT_PUBLIC_FIREBASE_APP_ID"
  | "NEXT_PUBLIC_FIREBASE_VAPID_KEY";

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

function requireEnv(name: RequiredPublicEnvName): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readOptionalEnv(name: "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID"): string | undefined {
  const value = process.env[name];

  if (!value) {
    return undefined;
  }

  return value.replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_API_URL").replace(/\/$/, "");
}

export function getFirebaseWebConfig(): FirebaseWebConfig {
  const measurementId = readOptionalEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID");

  return {
    apiKey: requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
    authDomain: requireEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
    projectId: requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    storageBucket: requireEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: requireEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: requireEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
    ...(measurementId ? { measurementId } : {}),
  };
}

export function getFirebaseVapidKey(): string {
  return requireEnv("NEXT_PUBLIC_FIREBASE_VAPID_KEY");
}
