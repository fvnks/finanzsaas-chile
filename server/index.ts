import app from "./app";

const PORT = process.env.PORT || 3001;

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log("DEPLOYMENT_VERSION: CORS_DEBUG_V2_CHECK_LOGS");
});
