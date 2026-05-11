// api/token.js
const crypto = require('crypto');

/**
 * Generates a ZegoCloud Token04 server-side.
 * Uses Node.js crypto only — no browser SDK, no `document`.
 */
function generateToken04(appId, userId, serverSecret, effectiveTimeInSeconds) {
  if (!appId || typeof appId !== 'number') throw new Error('Invalid appId');
  if (!userId || typeof userId !== 'string') throw new Error('Invalid userId');
  if (!serverSecret || serverSecret.length !== 32) throw new Error('serverSecret must be 32 characters');

  const now = Math.floor(Date.now() / 1000);
  const expire = now + effectiveTimeInSeconds;
  const nonce = Math.floor(Math.random() * 2147483647);

  const payload = JSON.stringify({
    app_id: appId,
    user_id: userId,
    nonce,
    ctime: now,
    expire,
    payload: '',
  });

  const plaintextBuf = Buffer.from(payload, 'utf8');

  // PKCS7 padding to multiple of 16 bytes
  const paddingLen = 16 - (plaintextBuf.length % 16);
  const padded = Buffer.concat([plaintextBuf, Buffer.alloc(paddingLen, paddingLen)]);

  // Derive AES key: MD5(serverSecret + expire)
  const md5Key = crypto
    .createHash('md5')
    .update(serverSecret + expire)
    .digest();

  // AES-128-CBC with zero IV
  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv('aes-128-cbc', md5Key, iv);
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);

  // Build token buffer: expire(4BE) + nonce(4BE) + encLen(2BE) + encrypted
  const tokenBuf = Buffer.alloc(10 + encrypted.length);
  tokenBuf.writeUInt32BE(expire, 0);
  tokenBuf.writeInt32BE(nonce, 4);
  tokenBuf.writeUInt16BE(encrypted.length, 8);
  encrypted.copy(tokenBuf, 10);

  return '04' + tokenBuf.toString('base64');
}

module.exports = function handler(req, res) {
  // CORS headers so your React frontend can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const appId = parseInt(process.env.VITE_ZEGO_APP_ID, 10);
    const serverSecret = process.env.VITE_ZEGO_SERVER_SECRET;
    const userId = req.query.userId || `User_${Math.floor(Math.random() * 9999)}`;

    if (!appId || !serverSecret) {
      return res.status(500).json({
        error: 'Missing VITE_ZEGO_APP_ID or VITE_ZEGO_SERVER_SECRET environment variables',
      });
    }

    const token = generateToken04(appId, String(userId), serverSecret, 3600);

    return res.status(200).json({ token, userId });
  } catch (err) {
    console.error('Token generation error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};