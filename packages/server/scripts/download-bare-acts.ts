/**
 * download-bare-acts.ts
 *
 * Downloads the full text of 16 essential Indian acts from indiacode.nic.in
 * and saves them as .txt files in packages/server/data/bare-acts/.
 *
 * Usage: npx tsx packages/server/scripts/download-bare-acts.ts [--force]
 *
 * The --force flag re-downloads even if the file already exists.
 * If a download fails, the script logs the error and continues.
 * You can also place .txt files manually in data/bare-acts/ and skip download.
 */

import fs from "node:fs";
import path from "node:path";
import { log, sleep } from "./lib/ingest-utils.js";

// ---------------------------------------------------------------------------
// Act registry — 16 essential Indian acts
//
// indiacode.nic.in serves acts at:
//   https://www.indiacode.nic.in/show-data?actid=<actid>&type=section
//
// The actid values below are the India Code central act identifiers.
// If the site changes its URL scheme, update the `fetchActText` function.
// ---------------------------------------------------------------------------
interface ActEntry {
  shortName: string;
  title: string;
  year: number;
  actId: string; // India Code act identifier
  filename: string;
}

export const ACT_REGISTRY: ActEntry[] = [
  {
    shortName: "BNS",
    title: "Bharatiya Nyaya Sanhita, 2023",
    year: 2023,
    actId: "202345",
    filename: "bns-2023.txt",
  },
  {
    shortName: "BNSS",
    title: "Bharatiya Nagarik Suraksha Sanhita, 2023",
    year: 2023,
    actId: "202346",
    filename: "bnss-2023.txt",
  },
  {
    shortName: "BSA",
    title: "Bharatiya Sakshya Adhiniyam, 2023",
    year: 2023,
    actId: "202347",
    filename: "bsa-2023.txt",
  },
  {
    shortName: "Constitution",
    title: "Constitution of India",
    year: 1950,
    actId: "COI",
    filename: "constitution-1950.txt",
  },
  {
    shortName: "Contract Act",
    title: "Indian Contract Act, 1872",
    year: 1872,
    actId: "187209",
    filename: "contract-act-1872.txt",
  },
  {
    shortName: "CPC",
    title: "Code of Civil Procedure, 1908",
    year: 1908,
    actId: "190805",
    filename: "cpc-1908.txt",
  },
  {
    shortName: "NI Act",
    title: "Negotiable Instruments Act, 1881",
    year: 1881,
    actId: "188126",
    filename: "ni-act-1881.txt",
  },
  {
    shortName: "Companies Act",
    title: "Companies Act, 2013",
    year: 2013,
    actId: "201318",
    filename: "companies-act-2013.txt",
  },
  {
    shortName: "Limitation Act",
    title: "Limitation Act, 1963",
    year: 1963,
    actId: "196336",
    filename: "limitation-act-1963.txt",
  },
  {
    shortName: "IT Act",
    title: "Information Technology Act, 2000",
    year: 2000,
    actId: "200021",
    filename: "it-act-2000.txt",
  },
  {
    shortName: "Consumer Protection",
    title: "Consumer Protection Act, 2019",
    year: 2019,
    actId: "201935",
    filename: "consumer-protection-2019.txt",
  },
  {
    shortName: "RERA",
    title: "Real Estate (Regulation and Development) Act, 2016",
    year: 2016,
    actId: "201616",
    filename: "rera-2016.txt",
  },
  {
    shortName: "Hindu Marriage",
    title: "Hindu Marriage Act, 1955",
    year: 1955,
    actId: "195525",
    filename: "hindu-marriage-1955.txt",
  },
  {
    shortName: "Hindu Succession",
    title: "Hindu Succession Act, 1956",
    year: 1956,
    actId: "195630",
    filename: "hindu-succession-1956.txt",
  },
  {
    shortName: "Arbitration Act",
    title: "Arbitration and Conciliation Act, 1996",
    year: 1996,
    actId: "199626",
    filename: "arbitration-act-1996.txt",
  },
  {
    shortName: "TPA",
    title: "Transfer of Property Act, 1882",
    year: 1882,
    actId: "188204",
    filename: "tpa-1882.txt",
  },
];

// ---------------------------------------------------------------------------
// Directories
// ---------------------------------------------------------------------------
const DATA_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "data",
  "bare-acts"
);

// ---------------------------------------------------------------------------
// Fetch act text from indiacode.nic.in
// ---------------------------------------------------------------------------
async function fetchActText(act: ActEntry): Promise<string> {
  const url = `https://www.indiacode.nic.in/show-data?actid=${act.actId}&type=section`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; NyaySahayak/1.0; legal-research-tool)",
      Accept: "text/html,application/xhtml+xml,*/*",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${act.shortName} (${url})`);
  }

  const html = await res.text();
  return extractTextFromHtml(html, act);
}

// ---------------------------------------------------------------------------
// Basic HTML -> text extraction (no external dependency)
// ---------------------------------------------------------------------------
function extractTextFromHtml(html: string, act: ActEntry): string {
  // Remove script/style tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // Convert common HTML elements to text
  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n");

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      // Only decode printable characters (space and above), skip control chars
      return code >= 32 ? String.fromCharCode(code) : "";
    });

  // Normalize whitespace
  text = text
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0)
    .join("\n");

  // Prepend act header
  const header = `${act.title}\n${"=".repeat(act.title.length)}\n\n`;
  return header + text;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
export async function downloadBareActs(force = false): Promise<string[]> {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const downloaded: string[] = [];
  const failed: string[] = [];

  for (const act of ACT_REGISTRY) {
    const filePath = path.join(DATA_DIR, act.filename);

    if (!force && fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.size > 100) {
        log(`SKIP  ${act.shortName} — already exists (${stat.size} bytes)`);
        downloaded.push(filePath);
        continue;
      }
    }

    try {
      log(`FETCH ${act.shortName} — ${act.title}`);
      const text = await fetchActText(act);

      if (text.length < 200) {
        throw new Error(
          `Extracted text too short (${text.length} chars) — site may have changed`
        );
      }

      fs.writeFileSync(filePath, text, "utf-8");
      log(`SAVED ${act.shortName} — ${text.length} chars → ${act.filename}`);
      downloaded.push(filePath);

      // Rate limit: ~1 req/sec to be respectful
      await sleep(1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  FAIL ${act.shortName}: ${msg}`);
      failed.push(act.shortName);
    }
  }

  log(
    `Download complete: ${downloaded.length} succeeded, ${failed.length} failed`
  );

  if (failed.length > 0) {
    log(
      `Failed acts: ${failed.join(", ")}\n` +
        `  You can place .txt files manually in:\n` +
        `  ${DATA_DIR}/`
    );
  }

  return downloaded;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------
if (
  process.argv[1]?.endsWith("download-bare-acts.ts") ||
  process.argv[1]?.endsWith("download-bare-acts.js")
) {
  const force = process.argv.includes("--force");
  downloadBareActs(force).catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
