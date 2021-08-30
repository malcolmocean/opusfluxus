import React, { useState } from 'react';
import useInput from '../hooks/useInput';
import {
  FormControl,
  FormLabel,
  FormHelperText,
  Flex,
  Spacer,
  Box,
  ButtonGroup,
  IconButton,
} from '@chakra-ui/react';

import { ArrowUpIcon, ArrowDownIcon } from '@chakra-ui/icons';

import { Button, CircularProgress } from '@chakra-ui/react';
import { Input, Textarea } from '@chakra-ui/react';

import SensitiveInput from './SensitiveInput';

import Message from './Message';
import { ArrowIcon } from '../icons';

const messages = {
  success: 'Sent to Workflowy!',
  error: 'Uh oh, there was a problem, check the console...',
};

export default function SettingsForm(props) {
  const { value: text, bind: bindText, reset: resetText } = useInput('hello');
  const { value: note, bind: bindNote, reset: resetNote } = useInput('hello');
  const [top, setTop] = useState(true);

  const [status, setStatus] = useState('');

  const handleSubmit = async (evt) => {
    evt.preventDefault();
  };
  return (
    <>
      <form onSubmit={handleSubmit}>
        {['error', 'success'].includes(status) && (
          <Message message={messages[status]} status={status} />
        )}
        <FormControl id="text" mt="4">
          <FormLabel>Session ID:</FormLabel>
          <SensitiveInput {...bindText} />
          <FormHelperText>
            Used to send to your Workflowy. Find out more here.
          </FormHelperText>
        </FormControl>
        <FormControl id="note" mt="4">
          <FormLabel>Parent ID:</FormLabel>
          <Input type="text" {...bindNote} />
          <FormHelperText>
            Used to tell us where to put things in Workflowy.
          </FormHelperText>
        </FormControl>

        <FormControl id="note" mt="4">
          <FormLabel>Add new item to top or bottom:</FormLabel>
        </FormControl>
        <ButtonGroup size="sm" isAttached variant="outline">
          <IconButton
            aria-label="Add to top"
            icon={<ArrowUpIcon />}
            isActive={top}
            onClick={() => {
              setTop(true);
            }}
          />
          <IconButton
            aria-label="Add to bottom"
            icon={<ArrowDownIcon />}
            isActive={!top}
            onClick={() => {
              setTop(false);
            }}
          />
        </ButtonGroup>
        <Button
          width="full"
          mt={4}
          variantcolor="#597e8d"
          variant="outline"
          type="submit"
          value="Save"
        >
          {status === 'loading' ? (
            <CircularProgress isIndeterminate size="24px" color="teal" />
          ) : (
            'Save'
          )}
        </Button>
      </form>
      <Box width="full" mt={6}>
        <Flex textAlign="center" gridGap={2} alignItems="center">
          <ArrowIcon />
          <Spacer />
          <ArrowIcon />
          <Spacer />
          <ArrowIcon />
        </Flex>
      </Box>
    </>
  );
}
