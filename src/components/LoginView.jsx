import React from 'react';

const LoginView = ({ email, setEmail, error, handleSubmit, setView }) => (
  <div className="section-view">
    <div className="auth-wrapper">
      <img src="mc.png" alt="MC" className="mc-logo" />
      <h2 className="title">Sign in</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-16">
          {error && <p className="error">{error}</p>}
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="input"
            style={{ color: '#1b1b1b' }}
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
            <img src="question.png" alt="Question img" style={{ marginLeft: '5px' }} />
          </a>
        </p>
      </div>
      <div>
        <button type="button" onClick={handleSubmit} className="btn">
          Next
        </button>
      </div>
    </div>
    <div className="opts">
      <p className="has-icon mb-0" style={{ fontSize: '15px' }}>
        <span className="icon">
          <img src="key.png" width="30px" alt="Key" />
        </span>
        Sign-in options
      </p>
    </div>
  </div>
);

export default LoginView;