import { Router } from 'express';
import { env } from '../../config/env';
import { isSuperAdmin } from '../../middlewares/auth.middleware';
import { requireAdminOrSuperAdmin, requireSuperAdmin } from '../../middlewares/rbac.middleware';
import { ah } from '../../middlewares/error.middleware';
import { sanitize } from '../../utils/validation';
import { SHEETS_CONFIG_SCHEMA, SHEETS_SYNC_SCHEMA } from '../../utils/schemas';
import {
  forwardToGoogleSheetsWebhook,
  getAdminOverviewSummary,
  getGoogleScriptUrl,
  getSheetsInspectorData,
  isAllowedScriptUrl,
  logGoogleSheetsSync,
  saveGoogleScriptUrl,
} from './sheets.service';

export const integrationsRouter = Router();

integrationsRouter.get(
  '/sheets/config',
  requireSuperAdmin,
  ah(async (_req, res) => {
    try {
      const scriptUrl = await getGoogleScriptUrl();
      res.json({ scriptUrl });
    } catch (error) {
      console.error('[API ERROR] GET /api/sheets/config:', error);
      res.json({ scriptUrl: env.googleSheetsWebhookUrl });
    }
  })
);

integrationsRouter.post(
  '/sheets/config',
  requireSuperAdmin,
  ah(async (req, res) => {
    const { scriptUrl = '' } = sanitize(req.body ?? {}, SHEETS_CONFIG_SCHEMA);
    if (scriptUrl && !isAllowedScriptUrl(scriptUrl)) {
      return res
        .status(400)
        .json({ error: 'URL must be a Google Apps Script web app URL (https://script.google.com/...).' });
    }
    const savedUrl = await saveGoogleScriptUrl(scriptUrl, req.user?.email);
    res.json({ success: true, scriptUrl: savedUrl });
  })
);

integrationsRouter.get(
  '/sheets/data',
  requireSuperAdmin,
  ah(async (_req, res) => {
    const payload = await getSheetsInspectorData();
    res.json(payload);
  })
);

integrationsRouter.post(
  '/sheets/sync',
  requireSuperAdmin,
  ah(async (req, res) => {
    const body = sanitize(req.body ?? {}, SHEETS_SYNC_SCHEMA);
    const targetTab = String(body.sheetName || body.tab || 'DatSan');
    const targetData = body.data || body.rowData || {};

    const result = await forwardToGoogleSheetsWebhook(targetTab, targetData);
    if (
      targetTab === 'Member_Registrations' ||
      targetTab === 'Court_Bookings' ||
      targetTab === 'Training_Registrations' ||
      targetTab === 'Store_Orders' ||
      targetTab === 'DonHang_Shop'
    ) {
      await logGoogleSheetsSync(
        targetTab === 'DonHang_Shop' ? 'Store_Orders' : targetTab,
        targetData,
        result.success ? 'SUCCESS' : 'FAILED',
        result.error
      );
    }

    if (!result.success) {
      return res.status(502).json({ success: false, error: result.error || 'Failed to dispatch to Google Sheets' });
    }
    return res.json({ success: true, message: `Dispatched to ${targetTab}` });
  })
);

integrationsRouter.get(
  '/admin/overview-summary',
  requireAdminOrSuperAdmin,
  ah(async (req, res) => {
    const summary = await getAdminOverviewSummary(isSuperAdmin(req.user));
    res.json(summary);
  })
);
