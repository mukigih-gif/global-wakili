import {
  AttendanceStatus,
  CommissionPayoutStatus,
  DepartmentStatus,
  EmployeeDocumentType,
  EmploymentType,
  GoalStatus,
  LeaveRequestStatus,
  LeaveType,
  PrismaClient,
  TenantRole,
} from '@prisma/client';

/*
 * 13_hr.seed.ts — Per-tenant HR layer (CLAUDE.md §12).
 *
 * Comprehensive HR-domain seed: EVERY employee-related model is populated
 * (standing directive — seed the whole domain, not a minimal subset).
 *
 * Two employee models exist and are used deliberately:
 *   - EmployeeProfile : the User-linked profile payroll (12), leave, attendance,
 *                       performance, goals and documents reference.
 *   - Employee        : the standalone HR record that Department.manager is a
 *                       HARD FK to, and that disciplinary / contracts / HR docs /
 *                       geo-attendance resolve employeeId against
 *                       (FINDING-008-003 "+ Employee seed"). DisciplinaryCase/
 *                       HrDocument/AttendanceRecord employeeId are loose Strings
 *                       but we use real Employee.id for app-layer consistency.
 *   - PerformanceReview/PerformanceGoal/EmployeePerformance/EmployeeGoal/
 *     EmployeeDocument employeeId|userId reference USER.
 *
 * Models seeded (per tenant):
 *   JobTitle, Employee, Department, EmployeeProfile, LeavePolicy, LeaveBalance,
 *   LeaveRequest, DisciplinaryCase, DisciplinaryAction, PerformanceReview,
 *   PerformanceGoal, EmployeePerformance, EmployeeGoal, EmployeeDocument,
 *   EmployeeContract, GeoFence, Attendance, AttendanceRecord, HrDocument,
 *   HrDocumentSignature, EmployeeOnboarding, CommissionPayout.
 *
 * DEMO/FIXTURE data — run only under the master demo-data gate.
 *
 * Policy:
 * - Idempotent: upsert on natural keys where they exist (staffNumber, name,
 *   userId, title, contractNumber, employeeProfileId+leaveType+year,
 *   userId+attendanceDate); everything else gated by findFirst on a
 *   deterministic key. Identity keys derived from ids; never rewritten.
 * - Tenant-scoped. No schema changes, no destructive operations.
 */

type SeedPrisma = PrismaClient;

type SeededUser = { id: string; name: string | null; email: string | null; tenantRole: TenantRole };

type JobTitleSeed = { title: string; code: string; level: string; isBillableRole: boolean; roles: TenantRole[] };
type DepartmentSeed = { name: string; code: string; costCenterCode: string; managerRole: TenantRole };
type LeavePolicySeed = { leaveType: LeaveType; name: string; code: string; days: number };

export type HrSeedResult = {
  status: 'hr_seed_complete';
  tenantId: string;
  jobTitles: number;
  departments: number;
  employees: number;
  employeeProfiles: number;
  leavePolicies: number;
  leaveBalances: number;
  leaveRequests: number;
  disciplinaryCases: number;
  disciplinaryActions: number;
  performanceReviews: number;
  performanceGoals: number;
  employeePerformances: number;
  employeeGoals: number;
  employeeDocuments: number;
  employeeContracts: number;
  geoFences: number;
  attendance: number;
  attendanceRecords: number;
  hrDocuments: number;
  hrDocumentSignatures: number;
  employeeOnboardings: number;
  commissionPayouts: number;
};

const JOB_TITLES: JobTitleSeed[] = [
  { title: 'Partner', code: 'JT-PARTNER', level: 'PARTNER', isBillableRole: true, roles: [TenantRole.FIRM_ADMIN] },
  { title: 'Advocate', code: 'JT-ADVOCATE', level: 'SENIOR', isBillableRole: true, roles: [TenantRole.ADVOCATE] },
  { title: 'Associate', code: 'JT-ASSOCIATE', level: 'MID', isBillableRole: true, roles: [TenantRole.ASSOCIATE] },
  { title: 'Legal Clerk', code: 'JT-CLERK', level: 'JUNIOR', isBillableRole: false, roles: [TenantRole.CLERK] },
  { title: 'Accountant', code: 'JT-ACCT', level: 'MID', isBillableRole: false, roles: [TenantRole.ACCOUNTANT] },
  { title: 'Branch Manager', code: 'JT-BRMGR', level: 'SENIOR', isBillableRole: false, roles: [TenantRole.BRANCH_MANAGER] },
];

const DEPARTMENTS: DepartmentSeed[] = [
  { name: 'Litigation', code: 'LIT', costCenterCode: 'CC-LIT', managerRole: TenantRole.ADVOCATE },
  { name: 'Conveyancing', code: 'CONV', costCenterCode: 'CC-CONV', managerRole: TenantRole.ASSOCIATE },
  { name: 'Corporate', code: 'CORP', costCenterCode: 'CC-CORP', managerRole: TenantRole.BRANCH_MANAGER },
];

/* Kenya Employment Act statutory minimums; one LeavePolicy row per leave type. */
const LEAVE_POLICIES: LeavePolicySeed[] = [
  { leaveType: LeaveType.ANNUAL, name: 'Annual Leave', code: 'LP-ANNUAL', days: 21 },
  { leaveType: LeaveType.SICK, name: 'Sick Leave', code: 'LP-SICK', days: 10 },
  { leaveType: LeaveType.MATERNITY, name: 'Maternity Leave', code: 'LP-MAT', days: 90 },
  { leaveType: LeaveType.PATERNITY, name: 'Paternity Leave', code: 'LP-PAT', days: 14 },
];

const HIRE_DATE = new Date('2024-01-15T00:00:00.000Z');

function splitName(fullName: string | null | undefined): { firstName: string; lastName: string; displayName: string } {
  const display = (fullName ?? '').trim() || 'Staff Member';
  const parts = display.split(/\s+/);
  const firstName = parts[0] ?? display;
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : firstName;
  return { firstName, lastName, displayName: display };
}

function suffix(id: string): string {
  return id.slice(-8);
}

async function resolveAdminId(prisma: SeedPrisma, tenantId: string): Promise<string> {
  const admin =
    (await prisma.user.findFirst({ where: { tenantId, tenantRole: TenantRole.FIRM_ADMIN }, select: { id: true } })) ??
    (await prisma.user.findFirst({ where: { tenantId, status: 'ACTIVE' }, select: { id: true } }));
  if (!admin) {
    throw new Error(`seedHr: no user for tenant ${tenantId}. Run 02_users first.`);
  }
  return admin.id;
}

export async function seedHr(prisma: PrismaClient, tenantId: string): Promise<HrSeedResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new Error('seedHr requires a tenantId.');
  }

  const branch = await prisma.branch.findFirst({ where: { tenantId }, select: { id: true } });
  if (!branch) {
    throw new Error(`seedHr: no branch for tenant ${tenantId}. Run 05_branches first.`);
  }
  const branchId = branch.id;
  const adminId = await resolveAdminId(prisma, tenantId);
  const year = new Date().getUTCFullYear();
  const attendanceDate = new Date(Date.UTC(year, 5, 2)); // 02 Jun, a workday

  const allUsers: SeededUser[] = await prisma.user.findMany({
    where: { tenantId, status: 'ACTIVE' },
    select: { id: true, name: true, email: true, tenantRole: true },
  });
  if (allUsers.length === 0) {
    throw new Error(`seedHr: no active users for tenant ${tenantId}. Run 02_users first.`);
  }
  const userByRole = (role: TenantRole) => allUsers.find((u) => u.tenantRole === role);

  // 1. Job titles (reference) → role map.
  const jobTitleIdByRole = new Map<TenantRole, string>();
  for (const jt of JOB_TITLES) {
    const record = await prisma.jobTitle.upsert({
      where: { tenantId_title: { tenantId, title: jt.title } },
      update: { code: jt.code, level: jt.level, isBillableRole: jt.isBillableRole, isActive: true },
      create: {
        tenantId,
        title: jt.title,
        code: jt.code,
        level: jt.level,
        isBillableRole: jt.isBillableRole,
        isActive: true,
      },
      select: { id: true },
    });
    for (const role of jt.roles) {
      jobTitleIdByRole.set(role, record.id);
    }
  }

  // 2. Employee (HR records) for the department managers.
  const employeeIdByRole = new Map<TenantRole, string>();
  for (const dept of DEPARTMENTS) {
    const user = userByRole(dept.managerRole);
    if (!user || employeeIdByRole.has(dept.managerRole)) {
      continue;
    }
    const names = splitName(user.name);
    const staffNumber = `STF-${suffix(user.id)}`;
    const employee = await prisma.employee.upsert({
      where: { tenantId_staffNumber: { tenantId, staffNumber } },
      update: { firstName: names.firstName, lastName: names.lastName, displayName: names.displayName, email: user.email, branchId, status: 'ACTIVE' },
      create: {
        tenantId,
        userId: user.id,
        staffNumber,
        firstName: names.firstName,
        lastName: names.lastName,
        displayName: names.displayName,
        email: user.email,
        branchId,
        jobTitle: `${dept.name} Lead`,
        employmentType: 'PERMANENT',
        status: 'ACTIVE',
        startDate: HIRE_DATE,
        currency: 'KES',
      },
      select: { id: true },
    });
    employeeIdByRole.set(dept.managerRole, employee.id);
  }
  const employeeIds = [...employeeIdByRole.values()];

  // 3. Departments (manager = matching Employee record).
  const departmentIds: string[] = [];
  for (const dept of DEPARTMENTS) {
    const managerEmployeeId = employeeIdByRole.get(dept.managerRole) ?? null;
    const record = await prisma.department.upsert({
      where: { tenantId_name: { tenantId, name: dept.name } },
      update: { code: dept.code, costCenterCode: dept.costCenterCode, status: DepartmentStatus.ACTIVE, branchId, managerEmployeeId },
      create: {
        tenantId,
        name: dept.name,
        code: dept.code,
        costCenterCode: dept.costCenterCode,
        status: DepartmentStatus.ACTIVE,
        branchId,
        managerEmployeeId,
        description: `${dept.name} department.`,
      },
      select: { id: true },
    });
    departmentIds.push(record.id);
  }

  // 4. EmployeeProfile per active user (round-robin department, role-mapped job title).
  const seededProfiles: { userId: string; profileId: string; role: TenantRole }[] = [];
  const profileIdByRole = new Map<TenantRole, string>();
  let profileIndex = 0;
  for (const user of allUsers) {
    const departmentId = departmentIds[profileIndex % departmentIds.length] ?? null;
    profileIndex += 1;
    const profile = await prisma.employeeProfile.upsert({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      update: { branchId, departmentId, jobTitleId: jobTitleIdByRole.get(user.tenantRole) ?? null, employmentType: EmploymentType.FULL_TIME },
      create: {
        tenantId,
        userId: user.id,
        employeeNumber: `EMP-${suffix(user.id)}`,
        employmentType: EmploymentType.FULL_TIME,
        hireDate: HIRE_DATE,
        branchId,
        departmentId,
        jobTitleId: jobTitleIdByRole.get(user.tenantRole) ?? null,
      },
      select: { id: true },
    });
    seededProfiles.push({ userId: user.id, profileId: profile.id, role: user.tenantRole });
    if (!profileIdByRole.has(user.tenantRole)) {
      profileIdByRole.set(user.tenantRole, profile.id);
    }
  }
  const profileIds = seededProfiles.map((p) => p.profileId);

  // 5. Leave policies.
  for (const policy of LEAVE_POLICIES) {
    await prisma.leavePolicy.upsert({
      where: { tenantId_name: { tenantId, name: policy.name } },
      update: { code: policy.code, leaveType: policy.leaveType, annualEntitlementDays: policy.days, status: 'ACTIVE' },
      create: {
        tenantId,
        name: policy.name,
        code: policy.code,
        leaveType: policy.leaveType,
        annualEntitlementDays: policy.days,
        effectiveFrom: new Date(Date.UTC(year, 0, 1)),
        status: 'ACTIVE',
        description: `${policy.name} — Kenya Employment Act entitlement.`,
      },
    });
  }

  // 6. Leave balances — one per profile per leave type.
  for (const employeeProfileId of profileIds) {
    for (const policy of LEAVE_POLICIES) {
      await prisma.leaveBalance.upsert({
        where: { tenantId_employeeProfileId_leaveType_year: { tenantId, employeeProfileId, leaveType: policy.leaveType, year } },
        update: { entitledDays: policy.days, accruedDays: policy.days, availableDays: policy.days, closingBalance: policy.days },
        create: {
          tenantId,
          employeeProfileId,
          leaveType: policy.leaveType,
          year,
          openingBalance: 0,
          accruedDays: policy.days,
          usedDays: 0,
          entitledDays: policy.days,
          availableDays: policy.days,
          closingBalance: policy.days,
          effectiveFrom: new Date(Date.UTC(year, 0, 1)),
        },
      });
    }
  }

  // 7. Leave requests — 1 approved (advocate, annual) + 1 pending (associate, sick).
  const advocate = userByRole(TenantRole.ADVOCATE);
  const associate = userByRole(TenantRole.ASSOCIATE);
  const leaveRequestSeeds = [
    { user: advocate, role: TenantRole.ADVOCATE, leaveType: LeaveType.ANNUAL, startDate: new Date(Date.UTC(year, 6, 1)), endDate: new Date(Date.UTC(year, 6, 10)), days: 8, status: LeaveRequestStatus.APPROVED, reason: 'Annual family leave.' },
    { user: associate, role: TenantRole.ASSOCIATE, leaveType: LeaveType.SICK, startDate: new Date(Date.UTC(year, 5, 15)), endDate: new Date(Date.UTC(year, 5, 17)), days: 3, status: LeaveRequestStatus.PENDING, reason: 'Medical — awaiting approval.' },
  ];
  for (const s of leaveRequestSeeds) {
    if (!s.user) continue;
    const existing = await prisma.leaveRequest.findFirst({ where: { tenantId, userId: s.user.id, leaveType: s.leaveType, startDate: s.startDate }, select: { id: true } });
    if (existing) continue;
    await prisma.leaveRequest.create({
      data: {
        tenantId,
        userId: s.user.id,
        employeeProfileId: profileIdByRole.get(s.role) ?? null,
        leaveType: s.leaveType,
        startDate: s.startDate,
        endDate: s.endDate,
        daysRequested: s.days,
        reason: s.reason,
        status: s.status,
        approvedById: s.status === LeaveRequestStatus.APPROVED ? adminId : null,
        approvedAt: s.status === LeaveRequestStatus.APPROVED ? s.startDate : null,
      },
    });
  }

  // 8. Disciplinary case (+ action) — real Employee.id subject.
  const disciplinaryEmployeeId = employeeIdByRole.get(TenantRole.ASSOCIATE) ?? employeeIds[0] ?? null;
  const disciplinaryTitle = 'Late Attendance — Verbal Warning (seed)';
  if (disciplinaryEmployeeId) {
    let caseId: string;
    const existing = await prisma.disciplinaryCase.findFirst({ where: { tenantId, title: disciplinaryTitle }, select: { id: true } });
    if (existing) {
      caseId = existing.id;
    } else {
      const created = await prisma.disciplinaryCase.create({
        data: {
          tenantId,
          employeeId: disciplinaryEmployeeId,
          reportedById: adminId,
          title: disciplinaryTitle,
          description: 'Repeated late arrival recorded over a two-week period.',
          incidentDate: new Date(Date.UTC(year, 4, 20)),
          severity: 'LOW',
          category: 'ATTENDANCE',
          status: 'OPEN',
        },
        select: { id: true },
      });
      caseId = created.id;
    }
    const actionType = 'VERBAL_WARNING';
    const existingAction = await prisma.disciplinaryAction.findFirst({ where: { tenantId, disciplinaryCaseId: caseId, actionType }, select: { id: true } });
    if (!existingAction) {
      await prisma.disciplinaryAction.create({
        data: {
          tenantId,
          disciplinaryCaseId: caseId,
          employeeId: disciplinaryEmployeeId,
          actionType,
          actionDate: new Date(Date.UTC(year, 4, 22)),
          notes: 'Verbal warning issued; expectations communicated.',
          issuedById: adminId,
        },
      });
    }
  }

  // 9. Performance review (+ goals) — employeeId is a USER FK; status COMPLETED.
  const reviewUser = advocate ?? allUsers[0];
  const cycleName = `${year} H1 Performance Review`;
  if (reviewUser) {
    let reviewId: string;
    const existing = await prisma.performanceReview.findFirst({ where: { tenantId, cycleName, employeeId: reviewUser.id }, select: { id: true } });
    if (existing) {
      reviewId = existing.id;
    } else {
      const created = await prisma.performanceReview.create({
        data: {
          tenantId,
          employeeId: reviewUser.id,
          reviewerId: adminId,
          cycleName,
          periodStart: new Date(Date.UTC(year, 0, 1)),
          periodEnd: new Date(Date.UTC(year, 5, 30)),
          status: 'COMPLETED',
          finalRating: 'MEETS_EXPECTATIONS',
          finalScore: 4,
          completedAt: new Date(Date.UTC(year, 5, 25)),
          completedById: adminId,
        },
        select: { id: true },
      });
      reviewId = created.id;
    }
    for (const goal of [
      { title: 'Billable hours target', weight: 60, target: '1,500 billable hours' },
      { title: 'CPD compliance', weight: 40, target: 'Complete LSK CPD points' },
    ]) {
      const existingGoal = await prisma.performanceGoal.findFirst({ where: { tenantId, performanceReviewId: reviewId, title: goal.title }, select: { id: true } });
      if (!existingGoal) {
        await prisma.performanceGoal.create({
          data: {
            tenantId,
            performanceReviewId: reviewId,
            employeeId: reviewUser.id,
            title: goal.title,
            weight: goal.weight,
            target: goal.target,
            status: 'ACTIVE',
          },
        });
      }
    }
  }

  // 10. EmployeePerformance (lightweight perf snapshot) — advocate.
  if (reviewUser) {
    const periodStart = new Date(Date.UTC(year, 0, 1));
    const existing = await prisma.employeePerformance.findFirst({ where: { tenantId, userId: reviewUser.id, reviewPeriodStart: periodStart }, select: { id: true } });
    if (!existing) {
      await prisma.employeePerformance.create({
        data: {
          tenantId,
          userId: reviewUser.id,
          employeeProfileId: profileIdByRole.get(reviewUser.tenantRole) ?? null,
          reviewPeriodStart: periodStart,
          reviewPeriodEnd: new Date(Date.UTC(year, 5, 30)),
          score: 4.2,
          summary: 'Strong performance across litigation matters.',
          reviewedById: adminId,
          reviewedAt: new Date(Date.UTC(year, 5, 28)),
        },
      });
    }
  }

  // 11. EmployeeGoals — advocate.
  if (reviewUser) {
    for (const goal of [
      { title: 'Mentor two junior associates', status: GoalStatus.ACTIVE },
      { title: 'Lead one pro bono matter', status: GoalStatus.ACHIEVED },
    ]) {
      const existing = await prisma.employeeGoal.findFirst({ where: { tenantId, userId: reviewUser.id, title: goal.title }, select: { id: true } });
      if (!existing) {
        await prisma.employeeGoal.create({
          data: {
            tenantId,
            userId: reviewUser.id,
            employeeProfileId: profileIdByRole.get(reviewUser.tenantRole) ?? null,
            title: goal.title,
            status: goal.status,
            targetDate: new Date(Date.UTC(year, 11, 31)),
            achievedAt: goal.status === GoalStatus.ACHIEVED ? new Date(Date.UTC(year, 4, 1)) : null,
          },
        });
      }
    }
  }

  // 12. EmployeeDocuments — advocate (contract + national ID).
  if (reviewUser) {
    for (const doc of [
      { documentType: EmployeeDocumentType.CONTRACT, title: 'Employment Contract' },
      { documentType: EmployeeDocumentType.NATIONAL_ID, title: 'National ID Card' },
    ]) {
      const existing = await prisma.employeeDocument.findFirst({ where: { tenantId, userId: reviewUser.id, documentType: doc.documentType }, select: { id: true } });
      if (!existing) {
        await prisma.employeeDocument.create({
          data: {
            tenantId,
            userId: reviewUser.id,
            employeeProfileId: profileIdByRole.get(reviewUser.tenantRole) ?? null,
            documentType: doc.documentType,
            title: doc.title,
            fileUrl: `https://seed.local/hr/${suffix(reviewUser.id)}/${doc.documentType}.pdf`,
            issueDate: HIRE_DATE,
            verifiedAt: new Date(Date.UTC(year, 0, 20)),
            verifiedById: adminId,
          },
        });
      }
    }
  }

  // 13. EmployeeContracts — one per HR Employee.
  for (const employeeId of employeeIds) {
    const contractNumber = `CON-${suffix(employeeId)}`;
    await prisma.employeeContract.upsert({
      where: { tenantId_contractNumber: { tenantId, contractNumber } },
      update: { status: 'ACTIVE', title: 'Employment Contract' },
      create: {
        tenantId,
        employeeId,
        contractNumber,
        title: 'Employment Contract',
        employmentType: 'PERMANENT',
        status: 'ACTIVE',
        startDate: HIRE_DATE,
        currency: 'KES',
        jobTitle: 'Department Lead',
      },
    });
  }

  // 14. GeoFence — HQ branch (attendance geo-fence target).
  const geoFenceName = 'HQ Geofence';
  let geoFenceId: string | null = null;
  const existingFence = await prisma.geoFence.findFirst({ where: { tenantId, name: geoFenceName }, select: { id: true } });
  if (existingFence) {
    geoFenceId = existingFence.id;
  } else {
    const fence = await prisma.geoFence.create({
      data: { tenantId, name: geoFenceName, branchId, latitude: -1.2921, longitude: 36.8219, radiusMeters: 200, active: true },
      select: { id: true },
    });
    geoFenceId = fence.id;
  }

  // 15. Attendance — one per profile (profile-linked daily attendance).
  for (const p of seededProfiles) {
    await prisma.attendance.upsert({
      where: { tenantId_userId_attendanceDate: { tenantId, userId: p.userId, attendanceDate } },
      update: { status: AttendanceStatus.PRESENT, employeeProfileId: p.profileId, branchId },
      create: {
        tenantId,
        userId: p.userId,
        employeeProfileId: p.profileId,
        branchId,
        attendanceDate,
        clockInAt: new Date(Date.UTC(year, 5, 2, 5, 0, 0)), // 08:00 EAT
        clockOutAt: new Date(Date.UTC(year, 5, 2, 14, 0, 0)), // 17:00 EAT
        totalHours: 9,
        status: AttendanceStatus.PRESENT,
      },
    });
  }

  // 16. AttendanceRecord — geo-fenced clock record per HR Employee.
  for (const employeeId of employeeIds) {
    const existing = await prisma.attendanceRecord.findFirst({ where: { tenantId, employeeId, attendanceDate }, select: { id: true } });
    if (!existing) {
      await prisma.attendanceRecord.create({
        data: {
          tenantId,
          employeeId,
          branchId,
          attendanceDate,
          clockInAt: new Date(Date.UTC(year, 5, 2, 5, 0, 0)),
          clockInMethod: 'WEB',
          clockInGeoFenceId: geoFenceId,
          clockInGeoFenceValid: true,
          clockOutAt: new Date(Date.UTC(year, 5, 2, 14, 0, 0)),
          clockOutMethod: 'WEB',
          hoursWorked: 9,
          status: 'CLOCKED_OUT',
        },
      });
    }
  }

  // 17. HrDocument (+ signature) — policy acknowledgement per HR Employee.
  for (const employeeId of employeeIds) {
    const title = 'Staff Handbook Acknowledgement';
    let docId: string;
    const existing = await prisma.hrDocument.findFirst({ where: { tenantId, employeeId, title }, select: { id: true } });
    if (existing) {
      docId = existing.id;
    } else {
      const created = await prisma.hrDocument.create({
        data: {
          tenantId,
          employeeId,
          title,
          category: 'POLICY',
          description: 'Acknowledgement of the staff handbook.',
          contentHash: `seedhash-${suffix(employeeId)}`,
          requiresSignature: true,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      docId = created.id;
    }
    const existingSig = await prisma.hrDocumentSignature.findFirst({ where: { tenantId, hrDocumentId: docId }, select: { id: true } });
    if (!existingSig) {
      await prisma.hrDocumentSignature.create({
        data: {
          tenantId,
          hrDocumentId: docId,
          employeeId,
          status: 'SIGNED',
          requestedById: adminId,
          signedAt: new Date(Date.UTC(year, 0, 25)),
          consentStatement: 'I acknowledge the staff handbook.',
        },
      });
    }
  }

  // 18. EmployeeOnboarding — one in-progress new hire.
  const onboardingEmail = `new.hire@${suffix(tenantId)}.seed`;
  const existingOnboarding = await prisma.employeeOnboarding.findFirst({ where: { tenantId, email: onboardingEmail }, select: { id: true } });
  if (!existingOnboarding) {
    await prisma.employeeOnboarding.create({
      data: {
        tenantId,
        name: 'Brian Otieno',
        email: onboardingEmail,
        position: 'Pupil Advocate',
        department: 'Litigation',
        startDate: new Date(Date.UTC(year, 6, 1)),
        steps: { contract: 'DONE', it_setup: 'PENDING', induction: 'PENDING' },
        status: 'IN_PROGRESS',
      },
    });
  }

  // 19. CommissionPayout — advocate matter-origination commission, linked to the payroll batch.
  if (reviewUser) {
    const payrollBatch = await prisma.payrollBatch.findFirst({ where: { tenantId, month: new Date().getUTCMonth() + 1, year }, select: { id: true } });
    const matter = await prisma.matter.findFirst({ where: { tenantId }, select: { id: true } });
    const reason = 'Matter origination commission (seed)';
    const existing = await prisma.commissionPayout.findFirst({ where: { tenantId, userId: reviewUser.id, reason }, select: { id: true } });
    if (!existing) {
      await prisma.commissionPayout.create({
        data: {
          tenantId,
          userId: reviewUser.id,
          payrollBatchId: payrollBatch?.id ?? null,
          matterId: matter?.id ?? null,
          amount: 50000,
          reason,
          status: CommissionPayoutStatus.APPROVED,
          approvedById: adminId,
          approvedAt: new Date(Date.UTC(year, 5, 26)),
        },
      });
    }
  }

  // Final counts via queries (idempotent-safe).
  const profileFilter = { tenantId, employeeProfileId: { in: profileIds } };
  const [
    jobTitles,
    departments,
    employees,
    employeeProfiles,
    leavePolicies,
    leaveBalances,
    leaveRequests,
    disciplinaryCases,
    disciplinaryActions,
    performanceReviews,
    performanceGoals,
    employeePerformances,
    employeeGoals,
    employeeDocuments,
    employeeContracts,
    geoFences,
    attendance,
    attendanceRecords,
    hrDocuments,
    hrDocumentSignatures,
    employeeOnboardings,
    commissionPayouts,
  ] = await Promise.all([
    prisma.jobTitle.count({ where: { tenantId, code: { in: JOB_TITLES.map((j) => j.code) } } }),
    prisma.department.count({ where: { tenantId, name: { in: DEPARTMENTS.map((d) => d.name) } } }),
    prisma.employee.count({ where: { tenantId, id: { in: employeeIds } } }),
    prisma.employeeProfile.count({ where: { tenantId, id: { in: profileIds } } }),
    prisma.leavePolicy.count({ where: { tenantId, name: { in: LEAVE_POLICIES.map((p) => p.name) } } }),
    prisma.leaveBalance.count({ where: { tenantId, employeeProfileId: { in: profileIds }, year } }),
    prisma.leaveRequest.count({ where: profileFilter }),
    prisma.disciplinaryCase.count({ where: { tenantId, title: disciplinaryTitle } }),
    prisma.disciplinaryAction.count({ where: { tenantId, employeeId: { in: employeeIds } } }),
    prisma.performanceReview.count({ where: { tenantId, cycleName } }),
    prisma.performanceGoal.count({ where: { tenantId, employeeId: { in: allUsers.map((u) => u.id) } } }),
    prisma.employeePerformance.count({ where: profileFilter }),
    prisma.employeeGoal.count({ where: profileFilter }),
    prisma.employeeDocument.count({ where: profileFilter }),
    prisma.employeeContract.count({ where: { tenantId, employeeId: { in: employeeIds } } }),
    prisma.geoFence.count({ where: { tenantId, name: geoFenceName } }),
    prisma.attendance.count({ where: profileFilter }),
    prisma.attendanceRecord.count({ where: { tenantId, employeeId: { in: employeeIds } } }),
    prisma.hrDocument.count({ where: { tenantId, employeeId: { in: employeeIds } } }),
    prisma.hrDocumentSignature.count({ where: { tenantId, employeeId: { in: employeeIds } } }),
    prisma.employeeOnboarding.count({ where: { tenantId, email: onboardingEmail } }),
    prisma.commissionPayout.count({ where: { tenantId, userId: { in: allUsers.map((u) => u.id) } } }),
  ]);

  return {
    status: 'hr_seed_complete',
    tenantId,
    jobTitles,
    departments,
    employees,
    employeeProfiles,
    leavePolicies,
    leaveBalances,
    leaveRequests,
    disciplinaryCases,
    disciplinaryActions,
    performanceReviews,
    performanceGoals,
    employeePerformances,
    employeeGoals,
    employeeDocuments,
    employeeContracts,
    geoFences,
    attendance,
    attendanceRecords,
    hrDocuments,
    hrDocumentSignatures,
    employeeOnboardings,
    commissionPayouts,
  };
}
