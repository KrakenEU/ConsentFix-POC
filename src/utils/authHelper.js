// Parse code from URL
export const parseCodeFromUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const codeParam = urlObj.searchParams.get('code');
    if (codeParam) {
      return decodeURIComponent(codeParam);
    }
  } catch (e) {
    const match = url.match(/code=([^&]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return null;
};

// Email validation
export const isValidEmail = (email) => {
  const value = String(email).toLowerCase();
  const formatRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formatRe.test(value)) return false;
  const allowedDomains = [
    'MC.com',
    'microsoft.com'
  ];
  const domain = value.split('@')[1];
  
  return allowedDomains.some(d => domain === d || domain.endsWith(`.${d}`));
};