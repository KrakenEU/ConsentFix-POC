import { useEffect } from 'react';

const TroubleshootView = ({ 
  email, 
  pastedUrl, 
  setPastedUrl, 
  handleSubmitPastedUrl,
  textAreaRef, 
  setView 
}) => {
  
  useEffect(() => {
    setPastedUrl('');
    if (textAreaRef.current) {
      textAreaRef.current.value = '';
      setTimeout(() => {
        textAreaRef.current.focus();
      }, 100);
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitPastedUrl(pastedUrl);
    }
  };

  return (
    <div className="section-view">
      <div className="auth-wrapper">
        <img src="mc.png" alt="MC" className="mc-logo" />
        <div className="identity">
          <button 
            className="back-btn" 
            onClick={() => setView('login')}
          >
            <img src="back.png" alt="Back" />
          </button>
          <span className="user-identity">{email}</span>
        </div>
        
        <h2 className="title">Having trouble?</h2>
        <p className="troubleshoot-instruction">
          If the authentication popup didn't open or you're experiencing issues:
        </p>
        
        <div className="paste-section">
          <h3>Copy and paste the full URL from the popup</h3>
          <textarea
            ref={textAreaRef}
            placeholder="Paste URL here and press Enter or click Submit..."
            value={pastedUrl}
            onChange={(e) => setPastedUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-area"
            style={{ color: '#1b1b1b' }}
          />
          
          <div className="submit-section">
            <button 
              onClick={() => handleSubmitPastedUrl(pastedUrl)}
              className="submit-btn"
              disabled={!pastedUrl.trim()}
            >
              Submit URL
            </button>
            <p className="instruction-text">
              Press Enter or click Submit to process the URL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TroubleshootView;