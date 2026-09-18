import { vi } from "vitest";
import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

Enzyme.configure({ adapter: new Adapter() });

// The existing spec files use Jest's `jest.fn()`/`jest.mock()` API;
// Vitest's equivalent is `vi`, so alias it to avoid rewriting every spec file.
globalThis.jest = vi;
