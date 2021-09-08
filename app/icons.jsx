import React from 'react';

const gray = 'gray.400';

import { createIcon } from '@chakra-ui/icons';

export const ArrowIcon = createIcon({
  displayName: 'ArrowIcon',
  viewBox: '0 0 24 24',
  defaultProps: { fill: 'none' },
  path: [
    <path key="1" stroke="none" d="M0 0h24v24H0z"></path>,
    <path key="2" stroke="#597e8d" d="M12 21V8a4 4 0 10-4 4h13"></path>,
    <path key="3" stroke="#597e8d" d="M18 15l3-3-3-3"></path>,
  ],
});

const defaultProps = {
  fill: 'none',
  stroke: '#2c3e50',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: '1.5',
};

export const SettingsIcon = createIcon({
  displayName: 'SettingsIcon',
  viewBox: '0 0 24 24',
  defaultProps,
  path: [
    <path key="1" stroke="none" d="M0 0h24v24H0z"></path>,
    <path
      key="2"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065z"
    ></path>,
    <circle key="3" cx="12" cy="12" r="3"></circle>,
  ],
});

const integrationStyles = { ...defaultProps, stroke: gray };

export const AppleIcon = createIcon({
  displayName: 'AppleIcon',
  viewBox: '0 0 24 24',
  defaultProps: integrationStyles,
  path: [
    <path key="1" stroke="none" d="M0 0h24v24H0z"></path>,
    <path
      key="2"
      d="M9 7c-3 0-4 3-4 5.5 0 3 2 7.5 4 7.5 1.088-.046 1.679-.5 3-.5 1.312 0 1.5.5 3 .5s4-3 4-5c-.028-.01-2.472-.403-2.5-3-.019-2.17 2.416-2.954 2.5-3-1.023-1.492-2.951-1.963-3.5-2-1.433-.111-2.83 1-3.5 1-.68 0-1.9-1-3-1zM12 4a2 2 0 002-2 2 2 0 00-2 2"
    ></path>,
  ],
});

export const AndroidIcon = createIcon({
  displayName: 'AndroidIcon',
  viewBox: '0 0 24 24',
  defaultProps: integrationStyles,
  path: [
    <path key="1" stroke="none" d="M0 0h24v24H0z"></path>,
    <path key="2" d="M4 10L4 16"></path>,
    <path key="3" d="M20 10L20 16"></path>,
    <path
      key="4"
      d="M7 9h10v8a1 1 0 01-1 1H8a1 1 0 01-1-1V9a5 5 0 0110 0"
    ></path>,
    <path key="5" d="M8 3L9 5"></path>,
    <path key="6" d="M16 3L15 5"></path>,
    <path key="7" d="M9 18L9 21"></path>,
    <path key="8" d="M15 18L15 21"></path>,
  ],
});

export const BookmarkIcon = createIcon({
  displayName: 'BookmarkIcon',
  viewBox: '0 0 24 24',
  defaultProps: integrationStyles,
  path: [
    <path key="1" stroke="none" d="M0 0h24v24H0z"></path>,
    <path key="2" d="M9 4h6a2 2 0 012 2v14l-5-3-5 3V6a2 2 0 012-2"></path>,
  ],
});
