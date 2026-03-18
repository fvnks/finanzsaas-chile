import app from "./app";
import { startExchangeRateCron } from "./services/exchangeRateService";

const PORT = process.env.PORT || 3001;

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  
  // Iniciar servicio de Tipo de Cambio (UF/USD)
  startExchangeRateCron();
});
