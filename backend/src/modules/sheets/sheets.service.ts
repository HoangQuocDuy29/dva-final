import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';

/**
 * Service to sync registrations and court bookings to Google Sheets in real-time.
 * Multi-tabs:
 * 1. Member_Registrations
 * 2. Court_Bookings
 * 3. Training_Registrations
 */
@Injectable()
export class SheetsService {
  private readonly logger = new Logger(SheetsService.name);
  private sheetsClient: any;
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
    this.initializeGoogleAuth();
  }

  private initializeGoogleAuth() {
    try {
      const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (email && privateKey) {
        const auth = new google.auth.JWT({
          email,
          key: privateKey,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        this.sheetsClient = google.sheets({ version: 'v4', auth });
        this.logger.log('Google Sheets API v4 initialized successfully.');
      } else {
        this.logger.warn('Google Service Account credentials missing in env. Running in simulation mode.');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Google Sheets client', error);
    }
  }

  /**
   * Append a row to a specific Google Sheet tab
   */
  async appendRow(tabName: 'Member_Registrations' | 'Court_Bookings' | 'Training_Registrations', values: any[]): Promise<boolean> {
    try {
      if (!this.sheetsClient || !this.spreadsheetId) {
        this.logger.log(`[Google Sheets Simulator] Appended to tab "${tabName}": ${JSON.stringify(values)}`);
        return true;
      }

      const range = `${tabName}!A:Z`;
      const response = await this.sheetsClient.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [values],
        },
      });

      this.logger.log(`Row appended to Google Sheets tab ${tabName} at ${response.data.updates?.updatedRange}`);
      return true;
    } catch (error) {
      this.logger.error(`Error appending row to Google Sheets tab ${tabName}:`, error);
      return false;
    }
  }
}
