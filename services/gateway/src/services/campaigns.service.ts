import axios from 'axios';
import { env } from '../config';
import { REQUEST_ID_HEADER } from '../middleware/requestLogger';

export interface CampaignValidationRequest {
  campaignId: string;
  brandId: string;
  metrics: Record<string, number>;
}

export interface CampaignValidationResult {
  campaignId: string;
  isValid: boolean;
  reasons: string[];
}

const analyticsClient = axios.create({
  baseURL: env.ANALYTICS_SERVICE_URL,
  timeout: 5000,
});

/**
 * Proxies campaign analytics validation to the FastAPI analytics-service,
 * which owns the Stellar-derived tip/revenue data used to verify claims.
 * Forwards the inbound request id so the call is traceable across both
 * services' logs.
 */
export async function validateCampaign(
  payload: CampaignValidationRequest,
  requestId?: string,
): Promise<CampaignValidationResult> {
  const { data } = await analyticsClient.post<CampaignValidationResult>(
    '/api/v1/campaigns/validate',
    payload,
    requestId ? { headers: { [REQUEST_ID_HEADER]: requestId } } : undefined,
  );

  return data;
}
