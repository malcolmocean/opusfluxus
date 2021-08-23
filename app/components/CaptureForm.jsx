import React, { useState } from 'react';
import useInput from '../hooks/useInput';

export default function CaptureForm(props) {
  const { value: text, bind: bindText, reset: resetText } = useInput('hello');
  const { value: note, bind: bindNote, reset: resetNote } = useInput('hello');

  const [status, setStatus] = useState('');

  const handleSubmit = async (evt) => {
    evt.preventDefault();
    console.log(text, note);
    setStatus('loading');
    const response = await fetch('/.netlify/functions/send', {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: text, note }),
    });
    setStatus('success!');
    resetText();
    resetNote();
  };
  return (
    <>
      <form onSubmit={handleSubmit}>
        <label>
          Text:
          <input type="text" {...bindText} />
        </label>
        <label>
          Note:
          <input type="text" {...bindNote} />
        </label>
        <input type="submit" value="Submit" />
      </form>
      {status}
    </>
  );
}
