import cron from 'node-cron';
import { MasterPowerHouseReport } from '../services/MasterPowerHouseReport';
import { EmailService } from '../services/EmailService'; // Logic to send attachments

const reportEngine = new MasterPowerHouseReport();
const emailService = new EmailService();

/**
 * SCHEDULE: Every Monday at 08:00 AM
 * Pattern: '0 8 * * 1'
 */
cron.schedule('0 8 * * 1', async () => {
  console.log('🚀 [Cron] Starting Weekly Power House Distribution...');

  try {
    // 1. Fetch Firms that have "Scheduled Reports" enabled
    const activeFirms = await prisma.lawFirm.findMany({
      where: { subPlan: 'ELITE' } 
    });

    for (const firm of activeFirms) {
      // 2. Generate the "In-Depth" Financial & Operational Data
      const reportData = await reportEngine.generateCustomReport(firm.id, {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        endDate: new Date()
      });

      // 3. Convert to Excel Buffer
      const excelBuffer = await reportEngine.exportReportToExcel(reportData);

      // 4. Dispatch via Email to the Partners
      await emailService.sendEmailWithAttachment({
        to: firm.notificationEmail || 'partners@firm.com',
        subject: `Weekly Executive Insights: ${firm.name}`,
        body: `Attached is your automated Power House Report for the past week. 
               It includes Matter Productivity, KRA VAT Claims, and User ROI.`,
        attachment: excelBuffer,
        fileName: `Weekly_Report_${new Date().toISOString().split('T')[0]}.xlsx`
      });

      console.log(`✅ [Cron] Report delivered to ${firm.name}`);
    }
  } catch (error) {
    console.error('❌ [Cron] Critical failure in Report Scheduler:', error);
  }
});