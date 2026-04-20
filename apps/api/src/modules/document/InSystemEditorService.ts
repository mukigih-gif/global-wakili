export interface EditorDraftPayload {
  title: string;
  html: string;
  createdBy: string;
  lastEditedBy?: string | null;
  summary?: string | null;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .trim();
}

export class InSystemEditorService {
  static normalizeHtml(html: string): string {
    if (!html?.trim()) {
      throw Object.assign(new Error('Editor HTML content is required'), {
        statusCode: 422,
        code: 'EDITOR_HTML_REQUIRED',
      });
    }

    return sanitizeHtml(html);
  }

  static buildDraftMetadata(params: EditorDraftPayload) {
    if (!params.title?.trim()) {
      throw Object.assign(new Error('Draft title is required'), {
        statusCode: 422,
        code: 'EDITOR_TITLE_REQUIRED',
      });
    }

    if (!params.createdBy?.trim()) {
      throw Object.assign(new Error('Draft creator is required'), {
        statusCode: 422,
        code: 'EDITOR_CREATED_BY_REQUIRED',
      });
    }

    const html = this.normalizeHtml(params.html);
    const now = new Date().toISOString();

    return {
      sourceEditor: 'INTERNAL_EDITOR',
      draft: {
        title: params.title.trim(),
        html,
        createdBy: params.createdBy,
        lastEditedBy: params.lastEditedBy?.trim() ?? params.createdBy,
        summary: params.summary?.trim() ?? null,
        createdAt: now,
        updatedAt: now,
      },
    };
  }

  static updateDraftMetadata(
    existingMetadata: Record<string, unknown> | null | undefined,
    params: {
      html?: string | null;
      title?: string | null;
      editedBy: string;
      summary?: string | null;
    },
  ) {
    if (!params.editedBy?.trim()) {
      throw Object.assign(new Error('Editor user is required'), {
        statusCode: 422,
        code: 'EDITOR_USER_REQUIRED',
      });
    }

    const current = (existingMetadata ?? {}) as Record<string, any>;
    const currentDraft = (current.draft ?? {}) as Record<string, any>;

    return {
      ...current,
      sourceEditor: 'INTERNAL_EDITOR',
      draft: {
        ...currentDraft,
        title: params.title?.trim() ?? currentDraft.title ?? null,
        html:
          params.html !== undefined && params.html !== null
            ? this.normalizeHtml(params.html)
            : currentDraft.html ?? null,
        lastEditedBy: params.editedBy.trim(),
        summary: params.summary?.trim() ?? currentDraft.summary ?? null,
        updatedAt: new Date().toISOString(),
      },
    };
  }
}