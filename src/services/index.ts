/**
 * Services Index — نقطة دخول موحدة لجميع الخدمات
 */

export { projectService }            from './projectService';
export { workerService }             from './workerService';
export { expenseService }            from './expenseService';
export { supplierService, purchaseService, supplierPaymentService } from './supplierService';
export { attendanceService }         from './attendanceService';
export { workerTransferService, workerMiscExpenseService, fundCustodyService } from './workerFinanceService';
export { customerService, equipmentService, wellService, notificationService, userProfileService } from './extraServices';
export { gitService, repoStatusService } from './gitService';
export type { Customer, Equipment, Well, AppNotification, UserProfile } from './extraServices';
export type { GitOperation, RepositoryStatus } from './gitService';

// Re-export base types
export type { ServiceResponse, PaginatedResponse, FilterOptions } from './base';
