import React from 'react';
import { Tooltip, Spacer, Flex, Link } from '@chakra-ui/react';

import { AndroidIcon, AppleIcon, BookmarkIcon } from '../icons';

import BookmarkletLink from './BookmarkletLink';

export default function IntegrationIcons({ sessionId, parentId }) {
  return (
    <Flex mr="auto" gridGap={2} alignItems="center">
      <Tooltip hasArrow label="Create iOS Shortcut">
        <span>
          <Link href="">
            <AppleIcon boxSize="2em" />
          </Link>
        </span>
      </Tooltip>
      <Spacer />
      <Tooltip hasArrow label="Android support coming soon!">
        <span style={{ cursor: 'not-allowed' }}>
          <AndroidIcon boxSize="2em" />
        </span>
      </Tooltip>
      <Spacer />
      <Tooltip hasArrow label="Drag me to bookmark bar">
        <span>
          <BookmarkletLink sessionId={sessionId} parentId={parentId}>
            <BookmarkIcon boxSize="2em" />
          </BookmarkletLink>
        </span>
      </Tooltip>
    </Flex>
  );
}
