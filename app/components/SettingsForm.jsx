import React from 'react';
import {
  FormControl,
  FormLabel,
  FormHelperText,
  Link,
  ButtonGroup,
  IconButton,
  Input,
  Text,
} from '@chakra-ui/react';

import { ArrowUpIcon, ArrowDownIcon } from '@chakra-ui/icons';

import SensitiveInput from './SensitiveInput';

export default function SettingsForm(props) {
  const { bindSessionId, bindParentId, top, setTop } = props;

  const handleSubmit = async (evt) => {
    evt.preventDefault();
  };
  return (
    <>
      <Text mt="4" fontSize="sm">
        Check the{' '}
        <Link
          textDecorationLine={'underline'}
          href="https://github.com/cjlm/send-to-workflowy#configuration"
        >
          docs
        </Link>{' '}
        for more info on the below settings.
      </Text>
      <form onSubmit={handleSubmit}>
        <FormControl id="session-id" mt="4">
          <FormLabel>Session ID:</FormLabel>
          <SensitiveInput {...bindSessionId} />
          <FormHelperText>Required to send to your WorkFlowy.</FormHelperText>
        </FormControl>
        <FormControl id="parent-id" mt="4">
          <FormLabel>Parent ID:</FormLabel>
          <Input type="text" fontSize="0.9em" {...bindParentId} />
          <FormHelperText>The location to send to in WorkFlowy.</FormHelperText>
        </FormControl>

        <FormControl id="priority" mt="4">
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
      </form>
    </>
  );
}
