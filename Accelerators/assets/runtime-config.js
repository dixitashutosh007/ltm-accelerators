// Default for local development and as a fallback. Overwritten at build time by
// scripts/generate-runtime-config.cjs with the deployed Advisory API address.
window.LTM_CONFIG = {
  "apiBase": "https://ypllpzzzc4.execute-api.ap-south-1.amazonaws.com",
  "cognito": {
    "region": "ap-south-1",
    "userPoolId": "ap-south-1_DEXPZQYwW",
    "clientId": "3d07e2fpemf275kbqraec91q92"
  }
};
