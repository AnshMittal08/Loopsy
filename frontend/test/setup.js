// Extends Vitest's expect with @testing-library/jest-dom matchers
// (toBeInTheDocument, toBeEmptyDOMElement, …) and resets the DOM between tests.
// (RTL's automatic cleanup only self-registers when test globals are enabled.)
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
