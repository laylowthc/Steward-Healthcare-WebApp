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

// Helper to determine if a token is a placeholder/mock for sandbox preview contexts
function isMockToken(token: string): boolean {
  return typeof token === 'string' && (token.startsWith('mock_') || token === 'mock-oauth-token-123' || token === 'demo_token');
}

// In-memory/session storage mock files for evaluation
function getMockDriveFiles(): GoogleDriveFile[] {
  const stored = sessionStorage.getItem('shc_mock_drive_files');
  if (stored) return JSON.parse(stored);
  
  const initial: GoogleDriveFile[] = [
    {
      id: 'mock_doc_1',
      name: 'Steward_Compliant_Caregivers_Ledger_2026.xlsx',
      mimeType: 'application/vnd.google-apps.spreadsheet',
      webViewLink: 'https://docs.google.com/spreadsheets/d/mock_ledger/edit',
      modifiedTime: new Date().toISOString(),
      size: '24 KB'
    },
    {
      id: 'mock_doc_2',
      name: 'Healthcare_Onboarding_Compliance_Checklist.docx',
      mimeType: 'application/vnd.google-apps.document',
      webViewLink: 'https://docs.google.com/document/d/mock_doc_checklist/edit',
      modifiedTime: new Date().toISOString(),
      size: '150 KB'
    },
    {
      id: 'mock_doc_3',
      name: 'Caregiver_Mandatory_Compliance_Feedback_Survey.form',
      mimeType: 'application/vnd.google-apps.form',
      webViewLink: 'https://docs.google.com/forms/d/mock_form_appl/edit',
      modifiedTime: new Date().toISOString()
    }
  ];
  sessionStorage.setItem('shc_mock_drive_files', JSON.stringify(initial));
  return initial;
}

function saveMockDriveFiles(files: GoogleDriveFile[]) {
  sessionStorage.setItem('shc_mock_drive_files', JSON.stringify(files));
}

// Helper to extract Spreadsheet ID from regular URL or dynamic string
export function extractSpreadsheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : urlOrId.trim();
}

// Check or create a designated parent folder on Google Drive
export async function getOrCreateFolder(token: string, folderName: string): Promise<string> {
  if (isMockToken(token)) {
    return 'mock_drive_folder_id';
  }

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
  if (isMockToken(token)) {
    let files = getMockDriveFiles();
    if (searchName) {
      files = files.filter(f => f.name.toLowerCase().includes(searchName.toLowerCase()));
    }
    return files;
  }

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
  if (isMockToken(token)) {
    const mockFile: GoogleDriveFile = {
      id: 'mock_uploaded_' + Date.now(),
      name: fileName,
      mimeType: (file as File).type || 'application/octet-stream',
      webViewLink: 'https://docs.google.com/viewer?url=https://example.com/mock-view',
      modifiedTime: new Date().toISOString(),
      size: `${Math.round((file.size || 50000) / 1024)} KB`
    };
    const files = getMockDriveFiles();
    saveMockDriveFiles([mockFile, ...files]);
    return mockFile;
  }

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
  if (isMockToken(token)) {
    const mockFile: GoogleDriveFile = {
      id: 'mock_spreadsheet_' + Date.now(),
      name: title + '.xlsx',
      mimeType: 'application/vnd.google-apps.spreadsheet',
      webViewLink: 'https://docs.google.com/spreadsheets/d/mock_doc_id/edit',
      modifiedTime: new Date().toISOString(),
      size: '12 KB'
    };
    const files = getMockDriveFiles();
    saveMockDriveFiles([mockFile, ...files]);
    return mockFile.id;
  }

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
  if (isMockToken(token)) {
    sessionStorage.setItem(`mock_sheet_${spreadsheetId}_${range}`, JSON.stringify(values));
    return true;
  }

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
  if (isMockToken(token)) {
    const key = `mock_sheet_${spreadsheetId}_${range}`;
    const stored = sessionStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    
    // Default mock table values
    return [
      ['Name', 'Email Address', 'Phone Number', 'Position', 'Compliance Status'],
      ['Eleanor Vance', 'e.vance@example.com', '07890 123456', 'Senior Nurse', 'Compliant'],
      ['Alun Sterling', 'a.sterling@example.org', '07711 987654', 'Care Assistant', 'Pending DBS'],
      ['Zara Patel', 'zara.p@care.co.uk', '07999 555666', 'Support Worker', 'Compliant']
    ];
  }

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
  if (isMockToken(token)) {
    return ['Onboarding Compliance', 'Interview Schedules', 'Working Timesheets'];
  }

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
