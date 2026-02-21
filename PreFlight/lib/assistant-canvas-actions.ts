export type CanvasAction = Record<string, unknown>;

const COMPLETE_ACTION_BLOCK_REGEX = /<canvas_action>\s*([\s\S]*?)\s*<\/canvas_action>/gi;
const INCOMPLETE_ACTION_BLOCK_REGEX = /<canvas_action>[\s\S]*$/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

export function extractCanvasActions(content: string): CanvasAction[] {
    const actions: CanvasAction[] = [];
    const matches = content.matchAll(COMPLETE_ACTION_BLOCK_REGEX);

    for (const match of matches) {
        const payload = match[1]?.trim();
        if (!payload) continue;

        try {
            const parsed = JSON.parse(payload);
            if (isRecord(parsed)) {
                actions.push(parsed);
            }
        } catch {
            // Ignore malformed action payloads and continue streaming text.
        }
    }

    return actions;
}

export function stripCanvasActions(content: string): string {
    const withoutCompleteBlocks = content.replace(COMPLETE_ACTION_BLOCK_REGEX, "");
    return withoutCompleteBlocks.replace(INCOMPLETE_ACTION_BLOCK_REGEX, "").trim();
}

