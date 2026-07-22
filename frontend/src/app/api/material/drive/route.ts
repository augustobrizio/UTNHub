import { NextResponse } from "next/server";

const ROOT_FOLDER_ID = "1ZgKML44drc8Wq3pcbHsc-ozPINv6xSHQ";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

interface DriveItem {
  id: string;
  name: string;
  type: "folder" | "file";
  mimeType: string;
  openUrl: string;
  previewUrl: string | null;
}

function decodeHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function inferMimeType(name: string, label: string) {
  const lowerName = name.toLowerCase();
  const lowerLabel = label.toLowerCase();

  if (lowerLabel.includes("folder") || lowerLabel.includes("carpeta")) {
    return DRIVE_FOLDER_MIME;
  }
  if (lowerName.endsWith(".pdf") || lowerLabel.includes("pdf")) {
    return "application/pdf";
  }
  if (lowerName.endsWith(".doc") || lowerName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lowerName.endsWith(".ppt") || lowerName.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (/\.(png|jpe?g|webp|gif)$/i.test(lowerName)) {
    return "image/*";
  }
  return "application/octet-stream";
}

function buildItem(id: string, rawName: string, rawLabel: string): DriveItem {
  const name = decodeHtml(rawName);
  const label = decodeHtml(rawLabel);
  const mimeType = inferMimeType(name, label);
  const type = mimeType === DRIVE_FOLDER_MIME ? "folder" : "file";

  return {
    id,
    name,
    type,
    mimeType,
    openUrl:
      type === "folder"
        ? `https://drive.google.com/drive/folders/${id}`
        : `https://drive.google.com/file/d/${id}/view`,
    previewUrl:
      type === "file"
        ? `https://drive.google.com/file/d/${id}/preview`
        : null,
  };
}

function parseDriveFolder(html: string): DriveItem[] {
  const itemRegex =
    /<div class="JxSEve" aria-label="([^"]+)"(?:(?!<div class="JxSEve")[\s\S])*?<div class=" i92Sbe a65Cwf"(?:(?!<div class="JxSEve")[\s\S])*?data-id="([^"]+)"(?:(?!<div class="JxSEve")[\s\S])*?<strong class="DNoYtb">([\s\S]*?)<\/strong>/g;
  const seen = new Set<string>();
  const items: DriveItem[] = [];

  for (const match of html.matchAll(itemRegex)) {
    const [, label, id, name] = match;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push(buildItem(id, name, label));
  }

  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name, "es", { numeric: true });
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId") ?? ROOT_FOLDER_ID;

  if (!/^[a-zA-Z0-9_-]+$/.test(folderId)) {
    return NextResponse.json({ error: "folderId invalido" }, { status: 400 });
  }

  const driveUrl = `https://drive.google.com/drive/folders/${folderId}?usp=sharing&hl=es-419`;

  try {
    const response = await fetch(driveUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Google Drive devolvio ${response.status}` },
        { status: response.status },
      );
    }

    const html = await response.text();
    const items = parseDriveFolder(html);

    return NextResponse.json({
      folderId,
      openUrl: `https://drive.google.com/drive/folders/${folderId}`,
      items,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo leer la carpeta publica de Drive",
      },
      { status: 502 },
    );
  }
}
