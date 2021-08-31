import { useState } from 'react';

import useLocalStorage from './useLocalStorage';

const useInput = (key, initialValue, localStorage = false) => {
  const [value, setValue] = localStorage
    ? useLocalStorage(key, initialValue)
    : useState(initialValue);

  return {
    value,
    setValue,
    reset: () => setValue(''),
    bind: {
      value,
      onChange: (event) => {
        setValue(event.target.value);
      },
    },
  };
};

export default useInput;
