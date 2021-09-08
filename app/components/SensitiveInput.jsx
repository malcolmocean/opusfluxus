import React, { useState } from 'react';

import { InputGroup, InputRightElement, Input } from '@chakra-ui/input';

import { Button } from '@chakra-ui/react';

export default function SensitiveInput({ value, onChange }) {
  const [show, setShow] = useState(false);
  const handleClick = () => setShow(!show);

  return (
    <InputGroup size="md">
      <Input
        pr="4.5rem"
        type={show ? 'text' : 'password'}
        placeholder="Enter session ID"
        value={value}
        onChange={onChange}
        fontSize="0.9em"
      />
      <InputRightElement width="4.5rem">
        <Button h="1.75rem" size="sm" onClick={handleClick}>
          {show ? 'Hide' : 'Show'}
        </Button>
      </InputRightElement>
    </InputGroup>
  );
}
