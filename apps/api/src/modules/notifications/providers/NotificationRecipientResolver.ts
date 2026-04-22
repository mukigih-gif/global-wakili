export type ResolvedNotificationRecipient = {
  recipientId?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  name?: string | null;
};

export class NotificationRecipientResolver {
  static async resolveUser(db: any, userId: string): Promise<ResolvedNotificationRecipient> {
    const user = await db.user.findFirst({
      where: { id: userId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
      },
    });

    if (!user) {
      throw Object.assign(new Error('Notification recipient user not found'), {
        statusCode: 404,
        code: 'NOTIFICATION_RECIPIENT_NOT_FOUND',
        details: { userId },
      });
    }

    return {
      recipientId: user.id,
      email: user.email ?? null,
      phoneNumber: user.phoneNumber ?? null,
      name: user.name ?? null,
    };
  }

  static async resolveMatterClientPrimaryContact(
    db: any,
    matterId: string,
  ): Promise<ResolvedNotificationRecipient> {
    const matter = await db.matter.findFirst({
      where: { id: matterId },
      select: {
        client: {
          select: {
            primaryContactName: true,
            primaryContactEmail: true,
            primaryContactPhone: true,
            portalUserId: true,
          },
        },
      },
    });

    if (!matter?.client) {
      throw Object.assign(new Error('Matter client contact not found'), {
        statusCode: 404,
        code: 'CLIENT_CONTACT_NOT_FOUND',
        details: { matterId },
      });
    }

    return {
      recipientId: matter.client.portalUserId ?? null,
      email: matter.client.primaryContactEmail ?? null,
      phoneNumber: matter.client.primaryContactPhone ?? null,
      name: matter.client.primaryContactName ?? null,
    };
  }

  static async resolveUsersByRole(
    db: any,
    tenantId: string,
    roleName: string,
  ): Promise<ResolvedNotificationRecipient[]> {
    const users = await db.user.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        roles: {
          some: {
            name: roleName,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
      },
    });

    return users.map((user: any) => ({
      recipientId: user.id,
      email: user.email ?? null,
      phoneNumber: user.phoneNumber ?? null,
      name: user.name ?? null,
    }));
  }
}