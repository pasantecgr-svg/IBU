import { OAuth2Client } from 'google-auth-library';

const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
const isPlaceholderClientId = (value = '') => {
  const normalized = String(value || '').trim();
  if (!normalized) return true;

  return /REEMPLAZAR|TU_CLIENT_ID_DE_GOOGLE|your-google-client-id|example|<your-google-client-id>/i.test(normalized);
};
const client = googleClientId && !isPlaceholderClientId(googleClientId) ? new OAuth2Client(googleClientId) : null;

export const verifyGoogleToken = async (credential) => {
  console.log('[Google OAuth] Iniciando verificación del token');
  console.log('[Google OAuth] LONGITUD credential:', credential ? credential.length : 0);
  console.log('[Google OAuth] GOOGLE_CLIENT_ID configurado:', !!googleClientId, googleClientId ? googleClientId.slice(0, 20) + '...' : 'vacío');

  if (!credential) {
    console.error('[Google OAuth] No se recibió el credential');
    throw new Error('No se recibió el credential de Google');
  }

  if (!googleClientId || isPlaceholderClientId(googleClientId) || !client) {
    console.error('[Google OAuth] Client ID inválido o placeholder:', googleClientId);
    throw new Error('GOOGLE_CLIENT_ID no está configurado o sigue siendo un valor de ejemplo. Genera uno real en Google Cloud Console.');
  }

  try {
    console.log('[Google OAuth] Llamando a verifyIdToken...');
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: googleClientId
    });

    const payload = ticket.getPayload();
    console.log('[Google OAuth] Payload recibido:', payload ? { email: payload.email, sub: payload.sub, aud: payload.aud } : null);

    if (!payload?.email) {
      console.error('[Google OAuth] El token no devolvió email');
      throw new Error('El token de Google no devolvió un email válido.');
    }

    return payload;
  } catch (error) {
    console.error('[Google OAuth] Error al verificar token:', error);
    const message = error?.message || 'Token de Google inválido';
    throw new Error(`Token de Google inválido: ${message}`);
  }
};
