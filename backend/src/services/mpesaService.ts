import axios from 'axios';

/**
 * 1. GENERATE ACCESS TOKEN
 * Fetches the OAuth2 token required for all Daraja API calls.
 */
const getAccessToken = async () => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  
  try {
    const { data } = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", 
      {
        headers: { Authorization: `Basic ${auth}` }
      }
    );
    return data.access_token;
  } catch (error) {
    console.error("M-Pesa Token Error:", error);
    throw new Error("Failed to generate M-Pesa access token");
  }
};

/**
 * 2. INITIATE STK PUSH
 * Triggers the Lipa Na M-Pesa popup on the client's handset.
 * @param reference - Formatted as 'MAT-123' (Matter) or 'DEP-456' (Deposit)
 */
export const initiateStkPush = async (amount: number, phone: string, reference: string) => {
  const token = await getAccessToken();
  
  // Format: YYYYMMDDHHMMSS
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  
  const shortcode = process.env.MPESA_SHORTCODE; // Usually the Paybill/Till
  const passkey = process.env.MPESA_PASSKEY;
  
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  try {
    const { data } = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline", // Use "CustomerBuyGoodsOnline" for Till Numbers
        Amount: Math.ceil(amount), // Ensure amount is an integer
        PartyA: phone,             // The user's phone (2547...)
        PartyB: shortcode,         // The receiving organization
        PhoneNumber: phone,
        CallBackURL: `${process.env.BASE_URL}/api/portal/mpesa-callback`,
        AccountReference: reference, 
        TransactionDesc: "Global Wakili Payment"
      },
      { 
        headers: { Authorization: `Bearer ${token}` } 
      }
    );
    return data;
  } catch (error: any) {
    console.error("STK Push Error:", error.response?.data || error.message);
    throw new Error("M-Pesa STK Push initiation failed");
  }
};