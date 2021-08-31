import React from 'react';
import {
  FormControl,
  FormLabel,
  FormHelperText,
  Flex,
  Spacer,
  Box,
  ButtonGroup,
  IconButton,
  Input,
} from '@chakra-ui/react';

import { ArrowUpIcon, ArrowDownIcon } from '@chakra-ui/icons';
import { ArrowIcon } from '../icons';

import SensitiveInput from './SensitiveInput';

export default function SettingsForm(props) {
  const { bindSessionId, bindParentId, top, setTop } = props;

  const handleSubmit = async (evt) => {
    evt.preventDefault();
  };
  return (
    <>
      <form onSubmit={handleSubmit}>
        <FormControl id="session-id" mt="4">
          <FormLabel>Session ID:</FormLabel>
          <SensitiveInput {...bindSessionId} />
          <FormHelperText>
            Used to send to your Workflowy. Find out more here.
          </FormHelperText>
        </FormControl>
        <FormControl id="parent-id" mt="4">
          <FormLabel>Parent ID:</FormLabel>
          <Input type="text" {...bindParentId} />
          <FormHelperText>
            Used to tell us where to put things in Workflowy.
          </FormHelperText>
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
