declare module 'africastalking' {
  interface ATCredentials {
    apiKey: string;
    username: string;
  }

  interface SMSRecipientResult {
    messageId?: string;
    statusCode?: string;
    status?: string;
    number?: string;
  }

  interface SMSData {
    Recipients?: SMSRecipientResult[];
  }

  interface SMSSendResult {
    SMSMessageData?: SMSData;
  }

  interface ATSMSSendOptions {
    to: string[];
    message: string;
    from?: string;
    enqueue?: boolean;
  }

  interface ATSMS {
    send(options: ATSMSSendOptions): Promise<SMSSendResult>;
  }

  interface ATClient {
    SMS: ATSMS;
  }

  function AfricasTalking(credentials: ATCredentials): ATClient;
  export = AfricasTalking;
}
