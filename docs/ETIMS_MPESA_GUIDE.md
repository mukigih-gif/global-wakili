# eTIMS & M-PESA Operations Guide

## KRA eTIMS Integration

### Flow
Invoice Finalized → eTIMS Queue → HTTP Submission to KRA → Control Number → QR Code → PDF Stamp → Audit Event

### Configuration (per tenant)
Store in `tenant.settings.etims` JSON field:
```json
{
  "baseUrl": "https://etims-api.kra.go.ke/etims-api/1.0",
  "deviceId": "<KRA-assigned-device-id>",
  "taxpayerPin": "<firm-KRA-PIN>",
  "apiKey": "<api-key>",
  "apiSecret": "<api-secret>"
}
```

### Sandbox Testing
Use `ETIMS_BASE_URL=https://etims-sbx.kra.go.ke/etims-api/1.0`
Apply for sandbox credentials at: https://etims.kra.go.ke

### Submission Status Codes
| Status | Meaning |
|--------|---------|
| SUBMITTED | Accepted by KRA, awaiting validation |
| ACCEPTED | Validated — control number issued |
| REJECTED | Rejected — check rejectionReason |
| FAILED | Network/auth error — retry |

### PDF Stamping
After ACCEPTED: embed `controlNumber` and `qrCode` into the invoice PDF.
QR code URL: `https://etims.kra.go.ke/verify/<controlNumber>`

---

## M-PESA Daraja Integration

### Flow
Invoice → Payment Request → STK Push (customer phone prompt) → Safaricom Callback → Receipt → Journal Entry → Audit Event

### Configuration
```bash
MPESA_ENV=production
MPESA_CONSUMER_KEY=<key>
MPESA_CONSUMER_SECRET=<secret>
MPESA_SHORTCODE=<paybill-or-till>
MPESA_PASSKEY=<lipa-na-mpesa-passkey>
MPESA_CALLBACK_URL=https://api.globalwakili.co.ke/api/mpesa/callback
```

### Callback URL Requirements
The callback URL must be:
1. Publicly accessible (not localhost)
2. HTTPS with valid SSL certificate
3. Responds within 60 seconds
4. Returns HTTP 200 on success

### Callback Validation
Safaricom callbacks originate from allowlisted IPs (see `MpesaStkPushService.validateCallbackOrigin()`).
In production, also validate at the load balancer / WAF level.

### ResultCode Meanings
| Code | Meaning |
|------|---------|
| 0 | Success — payment received |
| 1 | Insufficient funds |
| 17 | Risk limit exceeded |
| 1032 | Request cancelled by user |
| 1037 | Timeout — DS not available |

### Journal Entry on Success
When ResultCode = 0:
1. Create Payment record with MpesaReceiptNumber
2. Post Journal Entry: DEBIT Bank / CREDIT Accounts Receivable
3. Update Invoice.balanceDue
4. Emit PAYMENT_RECEIVED audit event
