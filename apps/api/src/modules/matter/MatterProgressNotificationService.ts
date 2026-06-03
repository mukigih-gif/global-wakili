/**
 * MatterProgressNotificationService.ts
 *
 * Sends a client notification when matter progress is saved.
 *
 * Triggered after any matter update that includes a progressStage change.
 * Notification sent to the client's portal user (if linked) and the
 * lead advocate.
 *
 * Called from matter.controller.ts after MatterService.update().
 *
 * Confirms Gap: "Does client receive notification when matter progress is saved?"
 * Answer: YES — after this service is wired.
 */

import { NotificationQueueService } from '../notifications/NotificationQueueService';

const STAGE_LABELS: Record<string, string> = {
  INTAKE:           'Matter Intake',
  RESEARCH:         'Research Phase',
  DRAFTING:         'Drafting',
  REVIEW:           'Under Review',
  FILING:           'Filing Stage',
  HEARING:          'Hearing Stage',
  NEGOTIATION:      'Negotiation',
  SETTLEMENT:       'Settlement',
  JUDGMENT:         'Judgment',
  APPEAL:           'Appeal Stage',
  EXECUTION:        'Execution',
  CLOSED:           'Closed',
  ARCHIVED:         'Archived',
};

export class MatterProgressNotificationService {
  /**
   * Call this after any matter update to notify the client and lead advocate
   * when progressStage has changed.
   */
  static async notifyIfProgressChanged(
    db: any,
    params: {
      tenantId: string;
      matterId: string;
      previousStage: string | null | undefined;
      newStage: string | null | undefined;
      updatedBy: string;
    },
  ): Promise<void> {
    // Only fire if stage actually changed
    if (!params.newStage || params.previousStage === params.newStage) return;

    const matter = await db.matter.findFirst({
      where: { tenantId: params.tenantId, id: params.matterId },
      select: {
        id: true,
        title: true,
        matterCode: true,
        clientId: true,
        leadAdvocateId: true,
        client: {
          select: {
            id: true,
            name: true,
            portalUserId: true,
          },
        },
      },
    }).catch(() => null);

    if (!matter) return;

    const stageLabel = STAGE_LABELS[params.newStage] ?? params.newStage.replace(/_/g, ' ');
    const matterTitle: string = matter.title ?? 'Your matter';
    const matterCode: string = matter.matterCode ? ` (${matter.matterCode})` : '';

    const recipients: Array<{ userId: string }> = [];

    // Notify client portal user if linked
    if (matter.client?.portalUserId) {
      recipients.push({ userId: matter.client.portalUserId });
    }

    // Notify lead advocate
    if (matter.leadAdvocateId && matter.leadAdvocateId !== params.updatedBy) {
      recipients.push({ userId: matter.leadAdvocateId });
    }

    if (!recipients.length) return;

    const debounceKey = `matter:progress:${params.matterId}:${params.newStage}:${new Date().toISOString().slice(0, 13)}`;

    await NotificationQueueService.enqueue({
      tenantId: params.tenantId,
      category: 'matter_update',
      priority: 'normal',
      entityType: 'MATTER',
      entityId: params.matterId,
      debounceKey,
      recipients,
      channels: ['SYSTEM_ALERT', 'EMAIL'],
      template: {
        systemTitle: `Matter Update: ${matterTitle}`,
        systemMessage: `Your matter "${matterTitle}"${matterCode} has progressed to: ${stageLabel}.`,
        emailSubject: `[Global Wakili] Matter Progress Update: ${matterTitle}`,
        emailBody: `
          <p>We are pleased to inform you of an update on your matter:</p>
          <p><strong>Matter:</strong> ${matterTitle}${matterCode}</p>
          <p><strong>Progress Stage:</strong> ${stageLabel}</p>
          <p>Please log in to the client portal to view the latest updates.</p>
        `,
        variables: {
          matterTitle,
          matterCode,
          stageLabel,
          clientName: matter.client?.name ?? '',
        },
      },
    }).catch((err) => {
      // Non-fatal — log but do not fail the matter update
      console.error('[MATTER_PROGRESS] Notification enqueue failed', {
        matterId: params.matterId,
        stage: params.newStage,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

export default MatterProgressNotificationService;
