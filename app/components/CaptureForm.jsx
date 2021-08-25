import React, { useState } from 'react';
import useInput from '../hooks/useInput';
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
} from '@chakra-ui/react';

import { Button, ButtonGroup } from '@chakra-ui/react';
import { Input } from '@chakra-ui/react';

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
        <FormControl id="email">
          <FormLabel>Text:</FormLabel>
          <Input type="text" {...bindText} />
          <FormHelperText>Text to go on your new Workflowy node</FormHelperText>
        </FormControl>

        <FormControl id="email">
          <FormLabel>Note:</FormLabel>
          <Input type="text" {...bindNote} />
          <FormHelperText>Add a note, why not?</FormHelperText>
        </FormControl>

        <Button colorScheme="blue" type="submit" value="Submit">
          Submit
        </Button>
      </form>
      {status}
    </>
  );
}
