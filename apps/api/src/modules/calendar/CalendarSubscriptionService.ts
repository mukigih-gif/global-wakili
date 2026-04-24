function toWebcalUrl(baseHttpUrl: string): string {
  if (baseHttpUrl.startsWith('https://')) {
    return `webcal://${baseHttpUrl.slice('https://'.length)}`;
  }

  if (baseHttpUrl.startsWith('http://')) {
    return `webcal://${baseHttpUrl.slice('http://'.length)}`;
  }

  return `webcal://${baseHttpUrl}`;
}

export class CalendarSubscriptionService {
  static generateSubscriptionToken(params: {
    tenantId: string;
    userId: string;
    scope: 'PERSONAL' | 'TEAM' | 'BRANCH' | 'MATTER';
    matterId?: string | null;
  }) {
    const raw = [
      params.tenantId,
      params.userId,
      params.scope,
      params.matterId ?? 'none',
      Date.now(),
    ].join(':');

    return Buffer.from(raw).toString('base64url');
  }

  static buildSubscriptionUrls(params: {
    baseUrl: string;
    token: string;
  }) {
    const httpUrl = `${params.baseUrl.replace(/\/$/, '')}/calendar/subscriptions/${params.token}.ics`;
    return {
      httpUrl,
      webcalUrl: toWebcalUrl(httpUrl),
    };
  }

  static createSubscription(params: {
    baseUrl: string;
    tenantId: string;
    userId: string;
    scope: 'PERSONAL' | 'TEAM' | 'BRANCH' | 'MATTER';
    matterId?: string | null;
  }) {
    const token = this.generateSubscriptionToken({
      tenantId: params.tenantId,
      userId: params.userId,
      scope: params.scope,
      matterId: params.matterId ?? null,
    });

    return {
      token,
      scope: params.scope,
      matterId: params.matterId ?? null,
      ...this.buildSubscriptionUrls({
        baseUrl: params.baseUrl,
        token,
      }),
      generatedAt: new Date(),
    };
  }

  static buildIcsFeed(params: {
    calendarName: string;
    events: Array<{
      id: string;
      title: string;
      description?: string | null;
      startTime: Date | string;
      endTime: Date | string;
    }>;
  }) {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Global Wakili//Calendar//EN',
      `X-WR-CALNAME:${params.calendarName}`,
    ];

    for (const event of params.events) {
      const start = new Date(event.startTime).toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z');
      const end = new Date(event.endTime).toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z');

      lines.push(
        'BEGIN:VEVENT',
        `UID:${event.id}@globalwakili`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace('.000Z', 'Z')}`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${String(event.title).replace(/\n/g, ' ')}`,
        `DESCRIPTION:${String(event.description ?? '').replace(/\n/g, '\\n')}`,
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');

    return lines.join('\r\n');
  }
}