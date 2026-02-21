import React from "react";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
    content: string;
    className?: string;
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
    const tokenRegex = /`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(([^)\s]+)\)/g;
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    let index = 0;

    for (const match of text.matchAll(tokenRegex)) {
        const start = match.index ?? 0;
        if (start > cursor) {
            nodes.push(text.slice(cursor, start));
        }

        const token = match[0];
        const key = `${keyPrefix}-token-${index++}`;

        if (token.startsWith("`") && token.endsWith("`")) {
            nodes.push(
                <code
                    key={key}
                    className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]"
                >
                    {token.slice(1, -1)}
                </code>
            );
        } else if (token.startsWith("**") && token.endsWith("**")) {
            nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
        } else if (token.startsWith("*") && token.endsWith("*")) {
            nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
        } else {
            const linkMatch = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
            if (linkMatch) {
                nodes.push(
                    <a
                        key={key}
                        href={linkMatch[2]}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline decoration-primary/50 underline-offset-2 hover:decoration-primary"
                    >
                        {linkMatch[1]}
                    </a>
                );
            } else {
                nodes.push(token);
            }
        }

        cursor = start + token.length;
    }

    if (cursor < text.length) {
        nodes.push(text.slice(cursor));
    }

    return nodes;
}

function renderParagraph(text: string, key: string) {
    const lines = text.split("\n");
    return (
        <p key={key}>
            {lines.map((line, i) => (
                <React.Fragment key={`${key}-line-${i}`}>
                    {renderInline(line, `${key}-inline-${i}`)}
                    {i < lines.length - 1 ? <br /> : null}
                </React.Fragment>
            ))}
        </p>
    );
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
    const text = content.trim();
    if (!text) return null;

    const lines = text.split("\n");
    const blocks: React.ReactNode[] = [];
    let i = 0;
    let blockIndex = 0;

    const pushParagraph = (buffer: string[]) => {
        if (buffer.length === 0) return;
        blocks.push(renderParagraph(buffer.join("\n"), `block-${blockIndex++}`));
        buffer.length = 0;
    };

    const paragraphBuffer: string[] = [];

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();

        if (!trimmed) {
            pushParagraph(paragraphBuffer);
            i += 1;
            continue;
        }

        const codeFence = trimmed.match(/^```(\w+)?$/);
        if (codeFence) {
            pushParagraph(paragraphBuffer);
            const language = codeFence[1] ?? "";
            i += 1;
            const codeLines: string[] = [];
            while (i < lines.length && !lines[i].trim().startsWith("```")) {
                codeLines.push(lines[i]);
                i += 1;
            }
            if (i < lines.length) i += 1;

            blocks.push(
                <pre
                    key={`block-${blockIndex++}`}
                    className="overflow-x-auto rounded-lg border border-border bg-muted/60 p-3"
                >
                    <code className={cn("font-mono text-xs", language ? `language-${language}` : "")}>
                        {codeLines.join("\n")}
                    </code>
                </pre>
            );
            continue;
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            pushParagraph(paragraphBuffer);
            const level = headingMatch[1].length;
            const headingText = headingMatch[2];
            const Heading = `h${level}` as keyof JSX.IntrinsicElements;
            const headingClass =
                level <= 2
                    ? "text-base font-semibold"
                    : level === 3
                        ? "text-sm font-semibold"
                        : "text-sm font-medium";

            blocks.push(
                <Heading key={`block-${blockIndex++}`} className={headingClass}>
                    {renderInline(headingText, `heading-${blockIndex}`)}
                </Heading>
            );
            i += 1;
            continue;
        }

        if (/^>\s?/.test(line)) {
            pushParagraph(paragraphBuffer);
            const quoteLines: string[] = [];
            while (i < lines.length && /^>\s?/.test(lines[i])) {
                quoteLines.push(lines[i].replace(/^>\s?/, ""));
                i += 1;
            }
            blocks.push(
                <blockquote
                    key={`block-${blockIndex++}`}
                    className="border-l-2 border-primary/40 pl-3 text-muted-foreground"
                >
                    {renderParagraph(quoteLines.join("\n"), `quote-${blockIndex}`)}
                </blockquote>
            );
            continue;
        }

        if (/^[-*+]\s+/.test(line)) {
            pushParagraph(paragraphBuffer);
            const items: string[] = [];
            while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^[-*+]\s+/, ""));
                i += 1;
            }
            blocks.push(
                <ul key={`block-${blockIndex++}`} className="list-disc pl-5 space-y-1">
                    {items.map((item, idx) => (
                        <li key={`ul-${blockIndex}-${idx}`}>
                            {renderInline(item, `ul-${blockIndex}-${idx}`)}
                        </li>
                    ))}
                </ul>
            );
            continue;
        }

        if (/^\d+\.\s+/.test(line)) {
            pushParagraph(paragraphBuffer);
            const items: string[] = [];
            while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
                items.push(lines[i].replace(/^\d+\.\s+/, ""));
                i += 1;
            }
            blocks.push(
                <ol key={`block-${blockIndex++}`} className="list-decimal pl-5 space-y-1">
                    {items.map((item, idx) => (
                        <li key={`ol-${blockIndex}-${idx}`}>
                            {renderInline(item, `ol-${blockIndex}-${idx}`)}
                        </li>
                    ))}
                </ol>
            );
            continue;
        }

        paragraphBuffer.push(line);
        i += 1;
    }

    pushParagraph(paragraphBuffer);

    return (
        <div className={cn("space-y-2 text-sm leading-relaxed", className)}>
            {blocks}
        </div>
    );
}
