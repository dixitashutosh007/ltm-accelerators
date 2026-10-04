// Default for local development and as a fallback. Overwritten at build time by
// scripts/generate-runtime-config.cjs with the deployed Advisory API address.
window.LTM_CONFIG = {
  "apiBase": "https://zvnmwxa9sf.execute-api.ap-south-1.amazonaws.com",
  "cognito": {
    "region": "ap-south-1",
    "userPoolId": "ap-south-1_91amN2bz4",
    "clientId": "4iiqcsgvsm0b4ngpps94ho4c67"
  },
  "features": {
    "costIq": false
  }
};
