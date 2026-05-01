import React from 'react';

/**
 * Reusable loading spinner.
 * Props:
 *   text  — optional label shown below the spinner (default: "Loading...")
 *   small — renders a compact inline version when true
 */
function Spinner({ text = 'Loading...', small = false }) {
  return (
    <div className={small ? 'spinner-wrap spinner-small' : 'spinner-wrap'}>
      <div className="spinner" />
      {!small && <p className="spinner-text">{text}</p>}
    </div>
  );
}

export default Spinner;
