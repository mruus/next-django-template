import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale, type Locale } from "../lib/i18n";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMergeObjects(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = out[key];

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      out[key] = deepMergeObjects(
        targetValue as Record<string, unknown>,
        sourceValue,
      );
      continue;
    }

    out[key] = sourceValue;
  }
  return out;
}

function setNamespaceValue(
  target: Record<string, unknown>,
  namespaceParts: string[],
  value: unknown,
) {
  let cur: Record<string, unknown> = target;

  for (let i = 0; i < namespaceParts.length; i++) {
    const key = namespaceParts[i];
    const isLeaf = i === namespaceParts.length - 1;

    if (isLeaf) {
      const existing = cur[key];
      if (isPlainObject(existing) && isPlainObject(value)) {
        cur[key] = deepMergeObjects(
          existing as Record<string, unknown>,
          value as Record<string, unknown>,
        );
      } else {
        cur[key] = value;
      }
      return;
    }

    const next = cur[key];
    if (!isPlainObject(next)) cur[key] = {};
    cur = cur[key] as Record<string, unknown>;
  }
}

async function walkJsonFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkJsonFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      results.push(fullPath);
    }
  }

  return results;
}

async function loadMessagesForLocale(locale: Locale): Promise<Record<string, unknown>> {
  // Resolve `messages/` relative to this file to work regardless of current working directory.
  const requestDir = path.dirname(fileURLToPath(import.meta.url));
  const messagesDir = path.resolve(requestDir, "../messages");
  const localeDir = path.join(messagesDir, locale);

  const messages: Record<string, unknown> = {};

  try {
    const files = await walkJsonFiles(localeDir);
    files.sort((a, b) => {
      const aSegments = path.relative(localeDir, a).split(path.sep).length;
      const bSegments = path.relative(localeDir, b).split(path.sep).length;
      return aSegments - bSegments;
    });
    for (const filePath of files) {
      const fileContents = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(fileContents) as unknown;

      const rel = path.relative(localeDir, filePath);
      const relParts = rel.split(path.sep);
      const lastIdx = relParts.length - 1;
      relParts[lastIdx] = relParts[lastIdx].replace(/\.json$/, "");

      setNamespaceValue(messages, relParts, parsed);
    }
  } catch {
    // If locale folder doesn't exist (or is misconfigured), keep messages empty.
  }

  return messages;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale =
    requested && (locales as readonly string[]).includes(requested)
      ? (requested as Locale)
      : defaultLocale;

  const messages = await loadMessagesForLocale(locale);

  return {
    locale,
    messages,
  };
});
