const HEYGEN_API_URL = 'https://api.heygen.com/v1';

// Helper to get formatted headers with both x-api-key and optional Bearer session token
const getHeyGenHeaders = (sessionToken = null) => {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey || apiKey === 'your_heygen_api_key' || apiKey.includes('••••')) {
    return null;
  }
  const headers = {
    'x-api-key': apiKey.trim(),
    'X-Api-Key': apiKey.trim(),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }
  return headers;
};

/**
 * Executes fetch to HeyGen API, validates Content-Type is JSON before parsing response.json(),
 * logs status, URL, and first 300 characters of response body if HTML is returned,
 * and extracts specific API error messages when HeyGen responds with an error payload.
 */
const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, options);

  const contentType = res.headers.get('content-type');

  if (!contentType?.includes('application/json')) {
    const body = await res.text();
    console.error(`[heygenService] HeyGen API returned non-JSON response! Status: ${res.status} ${res.statusText} | URL: ${url}`);
    console.error(`[heygenService] First 300 characters of response body:\n${body.substring(0, 300)}`);
    throw new Error('Expected JSON but received ' + contentType);
  }

  const data = await res.json();

  if (!res.ok || (data.code && data.code !== 100 && data.code !== 200 && data.code !== 0) || data.error) {
    const errorMsg = data.message || data.error || data.detail || (typeof data === 'string' ? data : JSON.stringify(data));
    throw new Error(errorMsg);
  }

  return data;
};

/**
 * Check if HeyGen API key is configured
 */
export const isHeyGenConfigured = () => {
  return Boolean(getHeyGenHeaders());
};

/**
 * Create a new HeyGen Real-Time Streaming Avatar session.
 * Generates the session token ONCE via streaming.create_token and initializes streaming.new.
 */
export const createHeyGenStream = async (avatarName, voiceId) => {
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey || apiKey === 'your_heygen_api_key' || apiKey.includes('••••')) {
    throw new Error('HEYGEN_API_KEY is not configured in environment variables.');
  }

  // Generate token ONLY ONCE during session creation
  const tokenData = await fetchJson(`${HEYGEN_API_URL}/streaming.create_token`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey.trim(),
      'X-Api-Key': apiKey.trim(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  const sessionToken = tokenData.data?.token || tokenData.token;
  if (!sessionToken) {
    throw new Error('Failed to obtain HeyGen session access token using HEYGEN_API_KEY.');
  }

  const payload = {
    quality: 'medium',
    avatar_name: avatarName || 'Wayne_20240711',
    voice: {
      voice_id: voiceId || '2d42b11e225d435383a140fcf0942bf7',
    },
  };

  console.log('[heygenService] Creating WebRTC streaming session for HeyGen avatar:', payload.avatar_name);

  // Initialize streaming session with sessionToken Bearer header
  const data = await fetchJson(`${HEYGEN_API_URL}/streaming.new`, {
    method: 'POST',
    headers: getHeyGenHeaders(sessionToken),
    body: JSON.stringify(payload),
  });

  const sessionData = data.data || data;
  const { session_id: sessionId, sdp, ice_servers: iceServers, ice_servers2 } = sessionData;

  console.log('[heygenService] Successfully created HeyGen session:', sessionId);

  return {
    sessionId,
    offer: sdp,
    iceServers: iceServers || ice_servers2 || [],
    sessionToken,
  };
};

/**
 * Submit client SDP answer to HeyGen to start WebRTC stream.
 * Reuses existing stored sessionToken without requesting a new token.
 */
export const submitHeyGenSdpAnswer = async (sessionId, answer, sessionToken = null) => {
  const headers = getHeyGenHeaders(sessionToken);
  if (!headers) throw new Error('HEYGEN_API_KEY is not configured.');

  console.log(`[heygenService] Submitting SDP answer for HeyGen session ${sessionId}`);

  const data = await fetchJson(`${HEYGEN_API_URL}/streaming.start`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      session_id: sessionId,
      sdp: typeof answer === 'string' ? { type: 'answer', sdp: answer } : answer,
    }),
  });

  return data;
};

/**
 * Submit ICE Candidate to HeyGen session.
 * Reuses existing stored sessionToken without requesting a new token.
 */
export const submitHeyGenIceCandidate = async (sessionId, candidate, sessionToken = null) => {
  const headers = getHeyGenHeaders(sessionToken);
  if (!headers) throw new Error('HEYGEN_API_KEY is not configured.');

  const data = await fetchJson(`${HEYGEN_API_URL}/streaming.ice`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      session_id: sessionId,
      candidate: candidate.candidate ? candidate : { candidate },
    }),
  });

  return data;
};

/**
 * Submit text script to speak with lip-sync on HeyGen Avatar.
 * Reuses existing stored sessionToken without requesting a new token.
 */
export const speakHeyGenTurn = async (sessionId, text, taskType = 'repeat', sessionToken = null) => {
  const headers = getHeyGenHeaders(sessionToken);
  if (!headers) throw new Error('HEYGEN_API_KEY is not configured.');

  console.log(`[heygenService] Sending speak task to HeyGen session ${sessionId}: "${text.substring(0, 60)}..."`);

  const data = await fetchJson(`${HEYGEN_API_URL}/streaming.task`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      session_id: sessionId,
      text,
      task_type: taskType,
    }),
  });

  console.log(`[heygenService] Speak task successfully sent to HeyGen session ${sessionId}`);
  return data;
};

/**
 * Stop and close HeyGen session.
 * Reuses existing stored sessionToken without requesting a new token.
 */
export const closeHeyGenStream = async (sessionId, sessionToken = null) => {
  const headers = getHeyGenHeaders(sessionToken);
  if (!headers || !sessionId) return null;

  try {
    console.log(`[heygenService] Closing HeyGen session ${sessionId}`);
    const data = await fetchJson(`${HEYGEN_API_URL}/streaming.stop`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ session_id: sessionId }),
    });

    return data;
  } catch (err) {
    console.warn(`[heygenService] Close session notice for ${sessionId}:`, err.message);
    return null;
  }
};
