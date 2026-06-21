import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.paddleclasharena",
  appName: "Paddle Clash Arena",
  webDir: "dist",
  backgroundColor: "#0a1a3d",
  ios: {
    contentInset: "always",
    backgroundColor: "#0a1a3d",
    limitsNavigationsToAppBoundDomains: true,
  },
};

export default config;
