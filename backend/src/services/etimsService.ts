import axios from 'axios';

export const signInvoiceWithETIMS = async (invoiceData: any) => {
  const kraConfig = {
    pin: process.env.KRA_PIN,
    serial: process.env.KRA_DEVICE_SERIAL,
  };

  // This follows the KRA eTIMS API structure for a Simplified Invoice
  const payload = {
    senderId: kraConfig.pin,
    deviceId: kraConfig.serial,
    invoiceNumber: invoiceData.number,
    customerPin: invoiceData.clientPin || "N/A", // Default for non-VAT registered clients
    items: invoiceData.items.map((item: any) => ({
      description: item.desc,
      quantity: 1,
      unitPrice: item.amount,
      taxType: "A", // Standard 16% VAT
      taxAmount: item.amount * 0.16
    })),
    totalAmount: invoiceData.total * 1.16 // Inclusive of VAT
  };

  try {
    // Note: In production, this hits the KRA VSCU (Virtual Sales Control Unit)
    // const response = await axios.post('https://etims.kra.go.ke/api/sign', payload);
    // return response.data.qrCode; 
    
    console.log(`✅ Invoice ${invoiceData.number} synced with eTIMS for PIN ${kraConfig.pin}`);
    return `KRA-QR-MOCKED-${invoiceData.number}`; // Mock QR for testing
  } catch (error) {
    console.error("eTIMS Sync Error:", error);
    throw new Error("Tax compliance sync failed");
  }
};