export class FinanceDashboard {

  static async getOverview(context: any) {
    return {
      revenue: 0,
      expenses: 0,
      profit: 0
    };
  }
}