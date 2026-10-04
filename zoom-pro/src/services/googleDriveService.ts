/**
 * Google Drive API v3 integration service for ZOOM-PRO
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  shared?: boolean;
}

export interface GoogleDriveUser {
  displayName: string;
  emailAddress: string;
  photoLink?: string;
  storageQuota?: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
  };
}

const DRIVE_TOKEN_KEY = 'zoom_pro_gdrive_access_token';
const DRIVE_TOKEN_EXPIRY_KEY = 'zoom_pro_gdrive_token_expiry';
const DRIVE_USER_KEY = 'zoom_pro_gdrive_user';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; expires_in?: number }) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
    gapi?: any;
  }
}

export class GoogleDriveService {
  private static token: string | null = null;
  private static tokenExpiry: number = 0;
  private static user: GoogleDriveUser | null = null;

  static init() {
    try {
      const storedToken = localStorage.getItem(DRIVE_TOKEN_KEY);
      const storedExpiry = localStorage.getItem(DRIVE_TOKEN_EXPIRY_KEY);
      const storedUser = localStorage.getItem(DRIVE_USER_KEY);

      if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry, 10)) {
        this.token = storedToken;
        this.tokenExpiry = parseInt(storedExpiry, 10);
        if (storedUser) {
          this.user = JSON.parse(storedUser);
        }
      } else {
        this.clearSession();
      }
    } catch {
      this.clearSession();
    }
  }

  static isConnected(): boolean {
    if (!this.token) this.init();
    return !!this.token && Date.now() < this.tokenExpiry;
  }

  static getAccessToken(): string | null {
    if (!this.isConnected()) return null;
    return this.token;
  }

  static getUser(): GoogleDriveUser | null {
    if (!this.user) this.init();
    return this.user;
  }

  static clearSession() {
    this.token = null;
    this.tokenExpiry = 0;
    this.user = null;
    localStorage.removeItem(DRIVE_TOKEN_KEY);
    localStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY);
    localStorage.removeItem(DRIVE_USER_KEY);
  }

  static setManualToken(token: string, expiresInSec: number = 3600, user?: GoogleDriveUser) {
    this.token = token;
    this.tokenExpiry = Date.now() + expiresInSec * 1000;
    localStorage.setItem(DRIVE_TOKEN_KEY, token);
    localStorage.setItem(DRIVE_TOKEN_EXPIRY_KEY, this.tokenExpiry.toString());
    if (user) {
      this.user = user;
      localStorage.setItem(DRIVE_USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * Request access token via Google Identity Services (GIS)
   */
  static async requestGoogleAuth(clientId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const gClientId =
        clientId ||
        (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
        '185216822413-apps.googleusercontent.com';

      if (!window.google?.accounts?.oauth2) {
        // If GIS script hasn't loaded yet, try after brief timeout or use direct token
        reject(new Error('Google Identity Services script se načítá. Zkuste to za chvíli.'));
        return;
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: gClientId,
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive',
        callback: async (response) => {
          if (response.error || !response.access_token) {
            reject(new Error(response.error || 'Autentizace Google Drive selhala'));
            return;
          }

          const token = response.access_token;
          const expiresIn = response.expires_in || 3600;
          this.token = token;
          this.tokenExpiry = Date.now() + expiresIn * 1000;
          localStorage.setItem(DRIVE_TOKEN_KEY, token);
          localStorage.setItem(DRIVE_TOKEN_EXPIRY_KEY, this.tokenExpiry.toString());

          // Fetch user profile info
          try {
            const userInfo = await this.fetchAboutUser(token);
            this.user = userInfo;
            localStorage.setItem(DRIVE_USER_KEY, JSON.stringify(userInfo));
          } catch (e) {
            console.warn('Could not fetch Google Drive user about info:', e);
          }

          resolve(token);
        },
        error_callback: (err) => {
          reject(err);
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    });
  }

  static async fetchAboutUser(accessToken?: string): Promise<GoogleDriveUser> {
    const token = accessToken || this.getAccessToken();
    if (!token) throw new Error('Uživatel není přihlášen k Google Drive');

    const res = await fetch(
      'https://www.googleapis.com/drive/v3/about?fields=user,storageQuota',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      throw new Error(`Google Drive API chyba: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      displayName: data.user?.displayName || 'Google Uživatel',
      emailAddress: data.user?.emailAddress || 'uzivatel@gmail.com',
      photoLink: data.user?.photoLink,
      storageQuota: data.storageQuota,
    };
  }

  /**
   * List files in Google Drive folder
   */
  static async listFiles(options: {
    folderId?: string;
    searchQuery?: string;
    pageSize?: number;
  } = {}): Promise<GoogleDriveFile[]> {
    const token = this.getAccessToken();
    if (!token) {
      // Return demo project files if not connected yet
      return this.getDemoFiles(options.folderId);
    }

    const folderQuery = options.folderId
      ? `'${options.folderId}' in parents`
      : `'root' in parents`;
    
    let q = `trashed = false and ${folderQuery}`;
    if (options.searchQuery) {
      q += ` and name contains '${options.searchQuery}'`;
    }

    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.append('q', q);
    url.searchParams.append('fields', 'files(id, name, mimeType, size, iconLink, thumbnailLink, webViewLink, webContentLink, createdTime, modifiedTime, parents, shared)');
    url.searchParams.append('pageSize', (options.pageSize || 50).toString());
    url.searchParams.append('orderBy', 'folder,modifiedTime desc');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.clearSession();
        throw new Error('Relace Google Drive vypršela. Přihlaste se prosím znovu.');
      }
      throw new Error(`Chyba při načítání souborů: ${res.statusText}`);
    }

    const data = await res.json();
    return data.files || [];
  }

  /**
   * Create a new folder in Google Drive
   */
  static async createFolder(name: string, parentFolderId?: string): Promise<GoogleDriveFile> {
    const token = this.getAccessToken();
    if (!token) {
      return {
        id: `mock-folder-${Date.now()}`,
        name,
        mimeType: 'application/vnd.google-apps.folder',
        createdTime: new Date().toISOString(),
      };
    }

    const metadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!res.ok) {
      throw new Error(`Nepodařilo se vytvořit složku: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Upload a text/json/blob file to Google Drive (Multipart Upload)
   */
  static async uploadFile(
    name: string,
    mimeType: string,
    content: string | Blob,
    parentFolderId?: string
  ): Promise<GoogleDriveFile> {
    const token = this.getAccessToken();
    if (!token) {
      return {
        id: `mock-file-${Date.now()}`,
        name,
        mimeType,
        size: typeof content === 'string' ? content.length.toString() : content.size.toString(),
        createdTime: new Date().toISOString(),
      };
    }

    const metadata: any = {
      name,
      mimeType,
    };
    if (parentFolderId) {
      metadata.parents = [parentFolderId];
    }

    const boundary = '-------zoom_pro_boundary_' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    let fileData = content;
    if (typeof content === 'string') {
      fileData = new Blob([content], { type: mimeType });
    }

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n`;

    const multipartRequestBody = new Blob([
      metadataPart,
      `${delimiter}Content-Type: ${mimeType}\r\n\r\n`,
      fileData,
      closeDelimiter,
    ]);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!res.ok) {
      throw new Error(`Chyba při nahrávání na Google Drive: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Delete a file/folder
   */
  static async deleteFile(fileId: string): Promise<boolean> {
    const token = this.getAccessToken();
    if (!token) return true;

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.ok;
  }

  /**
   * Initial template project folders builder
   */
  static async createProjectFolderStructure(
    projectName: string,
    parentFolderId?: string
  ): Promise<{ rootFolder: GoogleDriveFile; subfolders: GoogleDriveFile[] }> {
    const rootFolder = await this.createFolder(`📁 ${projectName} — VZT Projekt`, parentFolderId);
    
    const subfolderNames = [
      '01-Projektová dokumentace & Výkresy DWG',
      '02-Stavební deník & Fotodokumentace',
      '03-Výrobní kusovníky & TZB Kalkulace',
      '04-Předávací protokoly & Tlakové zkoušky',
      '05-Faktury & Montérské výkazy',
    ];

    const subfolders: GoogleDriveFile[] = [];
    for (const name of subfolderNames) {
      const sub = await this.createFolder(name, rootFolder.id);
      subfolders.push(sub);
    }

    return { rootFolder, subfolders };
  }

  /**
   * Demo files returned when user has not yet authenticated via OAuth popup
   */
  private static getDemoFiles(folderId?: string): GoogleDriveFile[] {
    if (folderId) {
      return [
        {
          id: 'demo-f1',
          name: 'VZT_Pudorys_2NP_Rez_V1.pdf',
          mimeType: 'application/pdf',
          size: '4285120',
          modifiedTime: new Date(Date.now() - 3600000 * 2).toISOString(),
          webViewLink: 'https://drive.google.com',
        },
        {
          id: 'demo-f2',
          name: 'Vyrobni_Kusovnik_Plech_500x300.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          size: '154820',
          modifiedTime: new Date(Date.now() - 3600000 * 8).toISOString(),
          webViewLink: 'https://drive.google.com',
        },
        {
          id: 'demo-f3',
          name: 'Protokol_Tesnosti_CSN_EN_1507.pdf',
          mimeType: 'application/pdf',
          size: '895400',
          modifiedTime: new Date(Date.now() - 86400000).toISOString(),
          webViewLink: 'https://drive.google.com',
        },
      ];
    }

    return [
      {
        id: 'folder-demo-1',
        name: '📁 Projekt D1 Park — VZT Hala 02',
        mimeType: 'application/vnd.google-apps.folder',
        modifiedTime: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        id: 'folder-demo-2',
        name: '📁 Nemocnice Motol — Pavilon E (Potrubní trasy)',
        mimeType: 'application/vnd.google-apps.folder',
        modifiedTime: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        id: 'folder-demo-3',
        name: '📁 Šablony předávacích protokolů a revizí',
        mimeType: 'application/vnd.google-apps.folder',
        modifiedTime: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        id: 'doc-demo-4',
        name: 'Standardy_Kvality_Montaze_VZT_2026.pdf',
        mimeType: 'application/pdf',
        size: '3145728',
        modifiedTime: new Date(Date.now() - 3600000 * 24).toISOString(),
        webViewLink: 'https://drive.google.com',
      },
      {
        id: 'doc-demo-5',
        name: 'Cenik_VZT_Plech_a_Izolace_02_2026.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: '425980',
        modifiedTime: new Date(Date.now() - 3600000 * 48).toISOString(),
        webViewLink: 'https://drive.google.com',
      },
    ];
  }
}
