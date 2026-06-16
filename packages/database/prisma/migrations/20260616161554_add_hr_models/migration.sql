-- AlterTable
ALTER TABLE "LeaveBalance" ADD COLUMN     "availableDays" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "carriedForwardDays" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "effectiveFrom" TIMESTAMP(3),
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "entitledDays" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lastAccruedAt" TIMESTAMP(3),
ADD COLUMN     "leavePolicyId" TEXT,
ADD COLUMN     "pendingDays" DECIMAL(10,2) NOT NULL DEFAULT 0,
ALTER COLUMN "employeeProfileId" DROP NOT NULL,
ALTER COLUMN "leaveType" TYPE TEXT USING "leaveType"::text,
ALTER COLUMN "year" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "staffNumber" TEXT,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "personalEmail" TEXT,
    "gender" TEXT,
    "maritalStatus" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nationalId" TEXT,
    "passportNumber" TEXT,
    "kraPin" TEXT,
    "nssfNumber" TEXT,
    "shaNumber" TEXT,
    "nhifNumber" TEXT,
    "branchId" TEXT,
    "departmentId" TEXT,
    "roleId" TEXT,
    "jobTitle" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'PERMANENT',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "probationEndDate" TIMESTAMP(3),
    "reportingManagerId" TEXT,
    "basicPay" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "salary" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "payrollEligible" BOOLEAN NOT NULL DEFAULT true,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelationship" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "county" TEXT,
    "country" TEXT DEFAULT 'Kenya',
    "postalCode" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "statusChangeReason" TEXT,
    "terminationDate" TIMESTAMP(3),
    "terminationReason" TEXT,
    "eligibleForRehire" BOOLEAN NOT NULL DEFAULT false,
    "finalPayNotes" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "probationEndDate" TIMESTAMP(3),
    "jobTitle" TEXT,
    "departmentId" TEXT,
    "branchId" TEXT,
    "reportingManagerId" TEXT,
    "basicPay" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "workingHoursPerWeek" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "leaveDaysPerYear" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "noticePeriodDays" INTEGER,
    "confidentialityRequired" BOOLEAN NOT NULL DEFAULT true,
    "nonCompeteRequired" BOOLEAN NOT NULL DEFAULT false,
    "documentId" TEXT,
    "signedByEmployeeAt" TIMESTAMP(3),
    "signedByEmployerAt" TIMESTAMP(3),
    "terms" JSONB,
    "metadata" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "activatedAt" TIMESTAMP(3),
    "activatedById" TEXT,
    "terminatedAt" TIMESTAMP(3),
    "terminatedById" TEXT,
    "terminationReason" TEXT,
    "supersededAt" TIMESTAMP(3),
    "supersededById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "branchId" TEXT,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "clockInAt" TIMESTAMP(3) NOT NULL,
    "clockInMethod" TEXT NOT NULL DEFAULT 'WEB',
    "clockInLatitude" DECIMAL(10,7),
    "clockInLongitude" DECIMAL(10,7),
    "clockInGeoFenceId" TEXT,
    "clockInGeoFenceValid" BOOLEAN NOT NULL DEFAULT true,
    "clockInGeoFenceDistanceMeters" DECIMAL(10,2),
    "clockInDeviceId" TEXT,
    "clockInIpAddress" TEXT,
    "clockInUserAgent" TEXT,
    "clockOutAt" TIMESTAMP(3),
    "clockOutMethod" TEXT,
    "clockOutLatitude" DECIMAL(10,7),
    "clockOutLongitude" DECIMAL(10,7),
    "clockOutGeoFenceId" TEXT,
    "clockOutGeoFenceValid" BOOLEAN,
    "clockOutGeoFenceDistanceMeters" DECIMAL(10,2),
    "clockOutDeviceId" TEXT,
    "clockOutIpAddress" TEXT,
    "clockOutUserAgent" TEXT,
    "hoursWorked" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'CLOCKED_IN',
    "notes" TEXT,
    "metadata" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeoFence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeoFence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeavePolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "leaveType" TEXT NOT NULL,
    "annualEntitlementDays" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "accrualFrequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "carryForwardAllowed" BOOLEAN NOT NULL DEFAULT true,
    "maxCarryForwardDays" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "encashmentAllowed" BOOLEAN NOT NULL DEFAULT false,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "approvalLevels" INTEGER NOT NULL DEFAULT 1,
    "appliesToEmploymentTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "appliesToDepartmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "appliesToBranchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "updatedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaryCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "witnessEmployeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hearingAt" TIMESTAMP(3),
    "hearingLocation" TEXT,
    "panelEmployeeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hearingNotes" TEXT,
    "latestActionType" TEXT,
    "resolution" TEXT,
    "closureNotes" TEXT,
    "closedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisciplinaryCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisciplinaryAction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "disciplinaryCaseId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,
    "issuedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisciplinaryAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "documentId" TEXT,
    "storageKey" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "contentHash" TEXT NOT NULL,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "revocationReason" TEXT,
    "createdById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HrDocumentSignature" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hrDocumentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "signerEmployeeId" TEXT,
    "signerUserId" TEXT,
    "signerName" TEXT,
    "signerEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "message" TEXT,
    "signedAt" TIMESTAMP(3),
    "signatureText" TEXT,
    "signatureImageHash" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "consentStatement" TEXT,
    "signedPayloadHash" TEXT,
    "certificateHash" TEXT,
    "certificatePayload" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HrDocumentSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Employee_tenantId_idx" ON "Employee"("tenantId");

-- CreateIndex
CREATE INDEX "Employee_tenantId_status_idx" ON "Employee"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Employee_userId_idx" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE INDEX "Employee_branchId_idx" ON "Employee"("branchId");

-- CreateIndex
CREATE INDEX "Employee_reportingManagerId_idx" ON "Employee"("reportingManagerId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_tenantId_staffNumber_key" ON "Employee"("tenantId", "staffNumber");

-- CreateIndex
CREATE INDEX "EmployeeContract_tenantId_idx" ON "EmployeeContract"("tenantId");

-- CreateIndex
CREATE INDEX "EmployeeContract_employeeId_idx" ON "EmployeeContract"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeContract_status_idx" ON "EmployeeContract"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeContract_tenantId_contractNumber_key" ON "EmployeeContract"("tenantId", "contractNumber");

-- CreateIndex
CREATE INDEX "AttendanceRecord_tenantId_idx" ON "AttendanceRecord"("tenantId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_employeeId_idx" ON "AttendanceRecord"("employeeId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_attendanceDate_idx" ON "AttendanceRecord"("attendanceDate");

-- CreateIndex
CREATE INDEX "AttendanceRecord_status_idx" ON "AttendanceRecord"("status");

-- CreateIndex
CREATE INDEX "GeoFence_tenantId_idx" ON "GeoFence"("tenantId");

-- CreateIndex
CREATE INDEX "GeoFence_active_idx" ON "GeoFence"("active");

-- CreateIndex
CREATE INDEX "LeavePolicy_tenantId_idx" ON "LeavePolicy"("tenantId");

-- CreateIndex
CREATE INDEX "LeavePolicy_status_idx" ON "LeavePolicy"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LeavePolicy_tenantId_name_key" ON "LeavePolicy"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LeavePolicy_tenantId_code_key" ON "LeavePolicy"("tenantId", "code");

-- CreateIndex
CREATE INDEX "DisciplinaryCase_tenantId_idx" ON "DisciplinaryCase"("tenantId");

-- CreateIndex
CREATE INDEX "DisciplinaryCase_employeeId_idx" ON "DisciplinaryCase"("employeeId");

-- CreateIndex
CREATE INDEX "DisciplinaryCase_status_idx" ON "DisciplinaryCase"("status");

-- CreateIndex
CREATE INDEX "DisciplinaryCase_incidentDate_idx" ON "DisciplinaryCase"("incidentDate");

-- CreateIndex
CREATE INDEX "DisciplinaryAction_tenantId_idx" ON "DisciplinaryAction"("tenantId");

-- CreateIndex
CREATE INDEX "DisciplinaryAction_disciplinaryCaseId_idx" ON "DisciplinaryAction"("disciplinaryCaseId");

-- CreateIndex
CREATE INDEX "DisciplinaryAction_employeeId_idx" ON "DisciplinaryAction"("employeeId");

-- CreateIndex
CREATE INDEX "HrDocument_tenantId_idx" ON "HrDocument"("tenantId");

-- CreateIndex
CREATE INDEX "HrDocument_employeeId_idx" ON "HrDocument"("employeeId");

-- CreateIndex
CREATE INDEX "HrDocument_status_idx" ON "HrDocument"("status");

-- CreateIndex
CREATE INDEX "HrDocument_category_idx" ON "HrDocument"("category");

-- CreateIndex
CREATE INDEX "HrDocumentSignature_tenantId_idx" ON "HrDocumentSignature"("tenantId");

-- CreateIndex
CREATE INDEX "HrDocumentSignature_hrDocumentId_idx" ON "HrDocumentSignature"("hrDocumentId");

-- CreateIndex
CREATE INDEX "HrDocumentSignature_status_idx" ON "HrDocumentSignature"("status");

-- CreateIndex
CREATE INDEX "LeaveBalance_employeeId_idx" ON "LeaveBalance"("employeeId");

-- CreateIndex
CREATE INDEX "LeaveBalance_leavePolicyId_idx" ON "LeaveBalance"("leavePolicyId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_tenantId_employeeId_leavePolicyId_key" ON "LeaveBalance"("tenantId", "employeeId", "leavePolicyId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeContract" ADD CONSTRAINT "EmployeeContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeoFence" ADD CONSTRAINT "GeoFence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryCase" ADD CONSTRAINT "DisciplinaryCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryAction" ADD CONSTRAINT "DisciplinaryAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisciplinaryAction" ADD CONSTRAINT "DisciplinaryAction_disciplinaryCaseId_fkey" FOREIGN KEY ("disciplinaryCaseId") REFERENCES "DisciplinaryCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocument" ADD CONSTRAINT "HrDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocumentSignature" ADD CONSTRAINT "HrDocumentSignature_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HrDocumentSignature" ADD CONSTRAINT "HrDocumentSignature_hrDocumentId_fkey" FOREIGN KEY ("hrDocumentId") REFERENCES "HrDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
