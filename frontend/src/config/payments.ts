export const paymentConfig = {
  square: {
    applicationId: import.meta.env.VITE_SQUARE_APP_ID,
    locationId: import.meta.env.SQUARE_LOCATION_ID,
    environment: import.meta.env.SQUARE_ENVIRONMENT as 'sandbox' | 'production'
  },
  cashapp: {
    clientId: import.meta.env.VITE_CASHAPP_CLIENT_ID,
    apiKey: import.meta.env.VITE_CASHAPP_API_KEY,
    businessId: import.meta.env.VITE_CASHAPP_BUSINESS_ID,
    environment: import.meta.env.VITE_CASHAPP_ENVIRONMENT as 'sandbox' | 'production'
  }
};