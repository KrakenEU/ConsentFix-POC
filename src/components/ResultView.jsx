const ResultView = ({ accessToken }) => (
  <div className="section-view">
    <div className="auth-wrapper">
      <img src="mc.png" alt="MC" className="mc-logo" />
      
      <div className="artifact-box">
        <h2 className="artifact-title">Authentication Successful!</h2>
        <p className="text-center mb-20">
          Successfully obtained access token
        </p>
        <div className="text-center mt-20">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(accessToken);
              alert('Access token copied to clipboard!');
            }} 
            className="copy-btn"
            style={{ marginLeft: '10px' }}
          >
            Copy Token
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default ResultView;