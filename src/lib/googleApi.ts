// Client-side lightweight Google Workspace API integration.
// Uses direct REST fetches with OAuth2 Bearer tokens.

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
  size?: string;
}

// Helper to extract Spreadsheet ID from regular URL or dynamic string
export function extractSpreadsheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : urlOrId.trim();
}

// Check or create a designated parent folder on Google Drive
export async function getOrCreateFolder(token: string, folderName: string): Promise<string> {
  const query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  try {
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!searchRes.ok) throw new Error('Failed to query folder on Drive');
    const searchData = await searchRes.json();
    
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Creating folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    if (!createRes.ok) throw new Error('Failed to create folder on Drive');
    const createData = await createRes.json();
    return createData.id;
  } catch (err) {
    console.error('getOrCreateFolder error:', err);
    throw err;
  }
}

// List files under a particular folder, or general files
export async function listDriveFiles(token: string, folderId?: string, searchName?: string): Promise<GoogleDriveFile[]> {
  let query = "trashed = false";
  if (folderId) {
    query += ` and '${folderId}' in parents`;
  }
  if (searchName) {
    query += ` and name contains '${searchName.replace(/'/g, "\\'")}'`;
  }

  const fields = 'files(id, name, mimeType, webViewLink, iconLink, modifiedTime, size)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=name&pageSize=50`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed list files from Google Drive');
    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('listDriveFiles error:', err);
    throw err;
  }
}

// Upload file multipart (Metadata + Binary Content)
export async function uploadFileToDrive(
  token: string,
  file: File | Blob,
  fileName: string,
  folderId?: string
): Promise<GoogleDriveFile> {
  const metadata = {
    name: fileName,
    parents: folderId ? [folderId] : undefined,
  };

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', file);

  try {
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,iconLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) {
      const errMsg = await res.text();
      throw new Error(`Upload failed: ${errMsg}`);
    }
    return await res.json();
  } catch (err) {
    console.error('uploadFileToDrive error:', err);
    throw err;
  }
}

// Create new blank Google Spreadsheet
export async function createGoogleSpreadsheet(token: string, title: string): Promise<string> {
  try {
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title,
        },
      }),
    });
    if (!res.ok) throw new Error('Failed to create new spreadsheet');
    const data = await res.json();
    return data.spreadsheetId;
  } catch (err) {
    console.error('createGoogleSpreadsheet error:', err);
    throw err;
  }
}

// Write cell range data (upsert)
export async function updateSpreadsheetRange(
  token: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<boolean> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });
    if (!res.ok) {
      const errMsg = await res.text();
      throw new Error(`Failed writing range: ${errMsg}`);
    }
    return true;
  } catch (err) {
    console.error('updateSpreadsheetRange error:', err);
    throw err;
  }
}

// Read cell range data
export async function readSpreadsheetRange(
  token: string,
  spreadsheetId: string,
  range: string
): Promise<any[][] | null> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed reading spreadsheet range');
    const data = await res.json();
    return data.values || null;
  } catch (err) {
    console.error('readSpreadsheetRange error:', err);
    throw err;
  }
}

// Retrieve spreadsheet sheet tab names
export async function getSpreadsheetTabs(token: string, spreadsheetId: string): Promise<string[]> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to retrieve spreadsheet metadata');
    const data = await res.json();
    return data.sheets?.map((s: any) => s.properties.title) || [];
  } catch (err) {
    console.error('getSpreadsheetTabs error:', err);
    throw err;
  }
}
