"use client";

import * as React from "react";
import { TextField } from "@whop/react/components";

export * from "@whop/react/components";

type TextInputProps = React.ComponentProps<typeof TextField.Input>;

/**
 * Convenience wrapper around frosted-ui's compound TextField so callers can use
 * a single self-closing input element, matching the Whop docs' `TextInput` name.
 */
export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(props, ref) {
    return (
      <TextField.Root>
        <TextField.Input ref={ref} {...props} />
      </TextField.Root>
    );
  },
);
