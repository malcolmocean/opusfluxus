import React from 'react';
import { Tooltip, Spacer, Flex, Link } from '@chakra-ui/react';

import { AndroidIcon, AppleIcon, BookmarkIcon } from '../icons';

import BookmarkletLink from './BookmarkletLink';

export default function IntegrationIcons({ sessionId, parentId }) {
  return (
    <Flex textAlign="center" gridGap={2} alignItems="center">
      <Tooltip hasArrow label="Create iOS Shortcut">
        <span>
          <Link href="">
            <AppleIcon />
          </Link>
        </span>
      </Tooltip>
      <Spacer />
      <Tooltip hasArrow label="Android support coming soon!">
        <span>
          <Link href="">
            <AndroidIcon />
          </Link>
        </span>
      </Tooltip>
      <Spacer />
      <Tooltip hasArrow label="Drag me to bookmark bar">
        <span>
          <BookmarkletLink sessionId={sessionId} parentId={parentId}>
            <BookmarkIcon />
          </BookmarkletLink>
        </span>
      </Tooltip>
    </Flex>
  );
}
