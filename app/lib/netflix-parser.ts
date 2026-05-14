export interface ParsedShow {
  title: string;
  episodeCount: number;
  lastWatched?: string;
}

function cleanTitle(raw: string): string {
  return raw
    .trim()
    .replace(
      /:\s*(Season|Series|Part|Chapter|Volume|Book|Miniseries|Limited Series)\s+\d+.*$/i,
      ""
    )
    .replace(/:\s*S\d{1,2}(:\s*E\d+)?.*$/i, "")
    .replace(/\s*-\s*(Season|Series)\s+\d+.*$/i, "")
    .replace(/\s*\(\d{4}\)\s*$/, "")
    .trim();
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseNetflixCSV(csvContent: string): ParsedShow[] {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase();
  const hasHeader = headerLine.includes("title") || headerLine.includes("date");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const showMap = new Map<string, { count: number; lastDate?: string }>();

  for (const line of dataLines) {
    const parts = parseCSVLine(line);
    if (!parts[0]) continue;
    const rawTitle = parts[0].trim();
    const date = parts[1]?.trim();
    const cleaned = cleanTitle(rawTitle);
    if (!cleaned || cleaned.length < 2) continue;

    const existing = showMap.get(cleaned) ?? { count: 0 };
    showMap.set(cleaned, {
      count: existing.count + 1,
      lastDate: date || existing.lastDate,
    });
  }

  return Array.from(showMap.entries())
    .map(([title, data]) => ({
      title,
      episodeCount: data.count,
      lastWatched: data.lastDate,
    }))
    .sort((a, b) => b.episodeCount - a.episodeCount)
    .slice(0, 25);
}
