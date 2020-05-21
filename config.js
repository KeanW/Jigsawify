// Autodesk Forge configuration
module.exports = {
  // Set environment variables or hard-code here
  credentials: {
    client_id: process.env.FORGE_CLIENT_ID,
    client_secret: process.env.FORGE_CLIENT_SECRET,
    callback_url: process.env.FORGE_CALLBACK_URL,
  },
  forge: {
    appId: "Adsk_JigsawPackage_v3",
    appAlias: "prod",
    activityId: "Adsk_JigsawActivity_v3",
    activityAlias: "prod",
    engineId: "Autodesk.AutoCAD+23_1",
    ossBucketName: "jigsawworks",
  },
  scopes: {
    // Required scopes for the server-side application
    internal: [
      "bucket:create",
      "bucket:read",
      "data:read",
      "data:create",
      "data:write",
    ],
    // Required scope for the client-side viewer
    public: ["viewables:read"],
  },
};
