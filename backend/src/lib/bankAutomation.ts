import Client from 'ssh2-sftp-client';
import * as openpgp from 'openpgp';
import { BankExportService } from './bankExport'; // Your existing CSV logic

export class BankAutomationService {
  /**
   * Encrypts and Uploads the Payroll File to the Bank
   */
  static async processDirectPayment(entries: any[], bankConfig: any) {
    const sftp = new Client();
    
    try {
      // 1. Generate the Raw CSV
      const rawCsv = BankExportService.generateBankCSV(entries);

      // 2. PGP Encryption (Bank's Public Key)
      const publicKey = await openpgp.readKey({ armoredKey: bankConfig.BANK_PUBLIC_KEY });
      const encryptedFile = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: rawCsv }),
        encryptionKeys: publicKey,
      });

      // 3. Connect and Upload to Bank H2H Server
      await sftp.connect({
        host: bankConfig.SFTP_HOST,
        port: 22,
        username: bankConfig.SFTP_USER,
        privateKey: bankConfig.YOUR_PRIVATE_KEY, // Auth via SSH Key
      });

      const fileName = `/upload/WAKILI_PAYROLL_${Date.now()}.csv.pgp`;
      await sftp.put(Buffer.from(encryptedFile as string), fileName);

      return { success: true, fileName };
    } catch (err) {
      console.error("Bank Transfer Failed:", err);
      throw new Error("Automated Bank Transfer failed.");
    } finally {
      await sftp.end();
    }
  }
}