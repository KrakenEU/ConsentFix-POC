import React from 'react';

const ProcessingView = ({ email, setView }) => (
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
      <div className="loading-section">
        <div className="spinner"></div>
        <h3 className="loading-title">Waiting for authentication...</h3>
        <p className="loading-message">Please continue the login process in the new window that has opened...</p>
      </div>
    </div>
  </div>
);

export default ProcessingView;