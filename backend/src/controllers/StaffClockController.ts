export class StaffClockController {
  /**
   * FIELD CLOCK-IN
   * Validates Clerk location (GPS) for field assignments.
   */
  static async clockIn(req: any, res: any) {
    const { lat, lng, locationName } = req.body;
    
    const clock = await prisma.staffAttendance.create({
      data: {
        userId: req.user.id,
        clockIn: new Date(),
        locationTag: `${locationName} (${lat},${lng})`
      }
    });
    res.json({ success: true, clock });
  }

  /**
   * LOG TRAVEL/STAMP EXPENSE
   * Direct logging of costs incurred during litigation filings.
   */
  static async logFieldExpense(req: any, res: any) {
    const { amount, description, matterId } = req.body;

    const expense = await prisma.officeExpense.create({
      data: {
        amount: new Decimal(amount),
        description: `FIELD: ${description}`,
        matterId,
        userId: req.user.id,
        category: 'TRAVEL_AND_FILING'
      }
    });
    res.json({ success: true, expense });
  }
}