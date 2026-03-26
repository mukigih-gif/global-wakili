// ==========================================
// SEED LOGGER UTILITY
// ==========================================

export const logger = {
  info: (message: string) => console.log(`ℹ️  ${message}`),
  success: (message: string) => console.log(`✅ ${message}`),
  warn: (message: string) => console.warn(`⚠️  ${message}`),
  error: (message: string, error?: any) => {
    console.error(`❌ ${message}`);
    if (error) console.error(error);
  },
  section: (title: string) => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`  ${title}`);
    console.log(`${'='.repeat(50)}\n`);
  },
};