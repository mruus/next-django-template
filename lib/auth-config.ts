// lib/auth-config.ts
const getTokenConfig = () => {
  const refreshBufferTime = parseInt(
    process.env.NEXT_PUBLIC_REFRESH_BUFFER_TIME ||
    process.env.REFRESH_BUFFER_TIME ||
    '300' // 5 minutes default
  );

  return { refreshBufferTime };
};

export const authConfig = getTokenConfig();

// Helper function to check if token needs refresh
export const shouldRefreshToken = (expiresAt: number): boolean => {
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  const bufferTime = authConfig.refreshBufferTime;

  return expiresAt - now <= bufferTime;
};

// Helper function to get token expiration info
export const getTokenExpirationInfo = (expiresAt: number) => {
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = expiresAt - now;

  return {
    timeLeft,
    isExpired: timeLeft <= 0,
    needsRefresh: shouldRefreshToken(expiresAt),
    expiresAt: new Date(expiresAt * 1000),
  };
};
