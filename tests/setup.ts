// Test setup for component tests (QA-TEST-002, task QA-T02).
// Registers the jest-dom matchers (toBeInTheDocument, toBeDisabled, …) on Vitest's expect and unmounts rendered
// components after each test. Testing Library only cleans up on its own when test globals are enabled; they are not.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
