// src/api/webhooks/mpesa.ts
import { MpesaService } from '../../services/MpesaService';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const result = await MpesaService.handleCallback(req.body);
    
    // Safaricom requires a specific 'Acceptance' response
    res.status(200).json({
      ResponseCode: "0",
      ResponseDesc: "Success"
    });
  } catch (error) {
    res.status(500).json({ ResponseCode: "1", ResponseDesc: "Internal Error" });
  }
}